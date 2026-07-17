import { AutomationCanvas } from "@/components/automation-canvas/AutomationCanvas";
import { createAutomationAction } from "@/app/actions";

export default function NewAutomationPage() {
  return (
    <div className="-m-6 h-[calc(100%+3rem)]">
      <AutomationCanvas saveAction={createAutomationAction} />
    </div>
  );
}
