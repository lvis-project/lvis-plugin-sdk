/**
 * `@lvis/plugin-sdk/packages` with the optional `ajv` peer absent.
 *
 * The built entry is copied, with the schema files it reads, into a directory
 * that has no `node_modules` on its resolution path, and a child Node process
 * imports it there. Importing must succeed (constants and types are usable
 * without the peer) and only a validator call may fail, with the error that
 * names the peer. The built file is used because that is what a consumer
 * loads; `check:dist-drift` keeps it in step with `src/packages.ts`.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("@lvis/plugin-sdk/packages without ajv", () => {
  it("imports, exposes the constants, and only a validator call throws the named error", () => {
    const sandbox = mkdtempSync(join(tmpdir(), "sdk-packages-no-ajv-"));
    try {
      mkdirSync(join(sandbox, "dist"));
      mkdirSync(join(sandbox, "schemas"));
      cpSync(join(ROOT, "dist/packages.js"), join(sandbox, "dist/packages.js"));
      for (const file of ["skill-package.schema.json", "agent-package.schema.json"]) {
        cpSync(join(ROOT, "schemas", file), join(sandbox, "schemas", file));
      }
      const script = `
        const m = await import(${JSON.stringify(join(sandbox, "dist/packages.js"))});
        console.log("imported " + m.SKILL_PACKAGE_SCHEMA_URL + " " + m.AGENT_COMPONENT_REF);
        try {
          m.validateSkillComponent({ name: "abc", description: "d" });
          console.log("validator returned");
        } catch (error) {
          console.log("threw " + error.name + ": " + error.message);
          console.log("cause " + (error.cause && error.cause.code));
        }
      `;
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: sandbox,
        encoding: "utf8",
        env: { PATH: process.env.PATH ?? "" },
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(
        "imported https://sdk.lvisai.xyz/schemas/skill.schema.json https://sdk.lvisai.xyz/schemas/agent.schema.json#/$defs/agentComponent",
      );
      expect(result.stdout).not.toContain("validator returned");
      expect(result.stdout).toContain(
        'threw PackageValidatorDependencyError: @lvis/plugin-sdk/packages validators need the optional peer dependency "ajv"',
      );
      expect(result.stdout).toContain("cause MODULE_NOT_FOUND");
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it("the published types for ./packages carry no ajv reference", () => {
    const pkg = JSON.parse(
      spawnSync("cat", [join(ROOT, "package.json")], { encoding: "utf8" }).stdout,
    ) as { exports: Record<string, { types?: string }> };
    expect(pkg.exports["./packages"].types).toBe("./dist/packages.d.ts");
    const dts = spawnSync("cat", [join(ROOT, "dist/packages.d.ts")], { encoding: "utf8" }).stdout;
    expect(dts).not.toMatch(/from "ajv|import\("ajv/);
    expect(dts).toContain("PackageValidatorDependencyError");
  });
});
