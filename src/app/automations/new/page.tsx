import { createAutomationAction } from "@/app/actions";
import { VisualWorkflowBuilder } from "@/components/VisualWorkflowBuilder";

export default function NewAutomationPage() {
  return <VisualWorkflowBuilder action={createAutomationAction} />;
}
