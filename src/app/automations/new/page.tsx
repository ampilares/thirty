import { PageHeader, Card } from "@/components/ui";
import { AutomationForm } from "@/components/AutomationForm";
import { createAutomationAction } from "@/app/actions";

export default function NewAutomationPage() {
  return (
    <>
      <PageHeader title="New automation" subtitle="Created as a draft — simulate it, then publish a version to activate" />
      <Card className="max-w-3xl">
        <AutomationForm action={createAutomationAction} />
      </Card>
    </>
  );
}
