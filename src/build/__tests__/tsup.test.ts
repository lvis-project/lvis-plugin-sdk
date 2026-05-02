import { describe, it, expect } from "vitest";
import {
  defineLvisPluginConfig,
  HOST_EXTERNAL_MODULES,
  HOST_BROWSER_EXTERNAL_MODULES,
} from "../tsup.js";

function asSingle(cfg: ReturnType<typeof defineLvisPluginConfig>) {
  if (Array.isArray(cfg)) {
    throw new Error("expected single-target config");
  }
  return cfg;
}

function asArray(cfg: ReturnType<typeof defineLvisPluginConfig>) {
  if (!Array.isArray(cfg)) {
    throw new Error("expected multi-target config");
  }
  return cfg;
}

describe("defineLvisPluginConfig", () => {
  it("emits self-containment defaults when called with no overrides", () => {
    const cfg = asSingle(defineLvisPluginConfig());
    expect(cfg.entry).toEqual(["src/index.ts", "src/hostPlugin.ts"]);
    expect(cfg.format).toEqual(["esm"]);
    expect(cfg.target).toBe("node20");
    expect(cfg.outDir).toBe("dist");
    expect(cfg.dts).toBe(false);
    expect(cfg.clean).toBe(true);
    expect(cfg.splitting).toBe(false);
    expect(cfg.sourcemap).toBe(true);
    expect(cfg.external).toEqual(["electron"]);
    // noExternal must contain a regex matching all packages.
    expect(Array.isArray(cfg.noExternal)).toBe(true);
    const noExternal = cfg.noExternal as RegExp[];
    expect(noExternal[0]).toBeInstanceOf(RegExp);
    expect("node-ical").toMatch(noExternal[0]);
    expect("@azure/msal-node").toMatch(noExternal[0]);
  });

  it("merges user external with host externals (cannot opt out of electron)", () => {
    const cfg = asSingle(defineLvisPluginConfig({ external: ["foo"] }));
    expect(cfg.external).toContain("electron");
    expect(cfg.external).toContain("foo");
  });

  it("dedupes string externals", () => {
    const cfg = asSingle(
      defineLvisPluginConfig({ external: ["electron", "foo", "foo"] }),
    );
    const externals = cfg.external as string[];
    expect(externals.filter((x) => x === "electron")).toHaveLength(1);
    expect(externals.filter((x) => x === "foo")).toHaveLength(1);
  });

  it("auto-adds react/react-dom externals for browser-platform builds", () => {
    const cfg = asSingle(
      defineLvisPluginConfig({
        platform: "browser",
        entry: { "ui/panel": "src/ui/panel.ts" },
      }),
    );
    expect(cfg.external).toContain("electron");
    expect(cfg.external).toContain("react");
    expect(cfg.external).toContain("react-dom");
  });

  it("does NOT add browser externals for node-platform builds", () => {
    const cfg = asSingle(defineLvisPluginConfig({ target: "node18" }));
    expect(cfg.external).not.toContain("react");
    expect(cfg.external).not.toContain("react-dom");
  });

  it("supports multi-target overrides as an array", () => {
    const cfgs = asArray(
      defineLvisPluginConfig([
        { entry: ["src/hostPlugin.ts"] },
        {
          entry: { "ui/panel": "src/ui/panel.ts" },
          platform: "browser",
          target: "es2020",
          clean: false,
        },
      ]),
    );
    expect(cfgs).toHaveLength(2);
    expect(cfgs[0].external).toEqual(["electron"]);
    expect(cfgs[0].clean).toBe(true); // default preserved
    expect(cfgs[1].external).toContain("react");
    expect(cfgs[1].clean).toBe(false); // override wins
    expect(cfgs[1].target).toBe("es2020");
  });

  it("respects user-provided noExternal override", () => {
    const cfg = asSingle(
      defineLvisPluginConfig({ noExternal: ["only-this"] }),
    );
    expect(cfg.noExternal).toEqual(["only-this"]);
  });

  it("exposes HOST_EXTERNAL_MODULES contract", () => {
    expect(HOST_EXTERNAL_MODULES).toContain("electron");
  });

  it("exposes HOST_BROWSER_EXTERNAL_MODULES contract", () => {
    expect(HOST_BROWSER_EXTERNAL_MODULES).toContain("react");
    expect(HOST_BROWSER_EXTERNAL_MODULES).toContain("react-dom");
  });
});
