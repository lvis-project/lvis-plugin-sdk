import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "../src/ui/components/Modal.js";
import { Button } from "../src/ui/components/Button.js";
import { Text } from "../src/ui/components/Text.js";
import { Stack } from "../src/ui/components/Stack.js";

const meta: Meta<typeof Modal> = {
  title: "UI/Modal",
  component: Modal,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};
export default meta;

type Story = StoryObj<typeof Modal>;

function Demo({ size }: { size?: "sm" | "md" | "lg" }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="설정 변경 확인"
        caption="이 작업은 되돌릴 수 없습니다."
        size={size}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={() => setOpen(false)}>확인</Button>
          </>
        }
      >
        <Stack gap="md">
          <Text>현재 설정을 새 프로필로 덮어쓰시겠습니까?</Text>
          <Text variant="muted">기존 값은 자동으로 백업되지 않습니다.</Text>
        </Stack>
      </Modal>
    </>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Small: Story = { render: () => <Demo size="sm" /> };
export const Large: Story = { render: () => <Demo size="lg" /> };

export const BusyState: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(() => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    }, []);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open (busy demo)</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="처리 중에는 닫히지 않음"
          disableDismiss={busy}
          footer={
            <Button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                timerRef.current = setTimeout(() => {
                  setBusy(false);
                  setOpen(false);
                  timerRef.current = null;
                }, 1500);
              }}
            >
              {busy ? "처리 중..." : "시작"}
            </Button>
          }
        >
          <Text>버튼을 누르면 모달이 1.5s 동안 잠겨 Esc/오버레이 클릭이 무시됩니다.</Text>
        </Modal>
      </>
    );
  },
};
