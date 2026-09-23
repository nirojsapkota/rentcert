import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./email-layout";

type Props = {
  preview: string;
  heading: string;
  greetingName: string;
  paragraphs: string[];
  dueDateLabel: string;
  dueDate: string;
  propertyUrl: string;
  accountUrl: string;
};

export function ReminderEmail(props: Props) {
  return (
    <EmailLayout preview={props.preview}>
      <Heading as="h1" style={{ fontSize: "22px" }}>
        {props.heading}
      </Heading>
      <Text>Hi {props.greetingName},</Text>
      {props.paragraphs.map((paragraph) => (
        <Text key={paragraph}>{paragraph}</Text>
      ))}
      <Text>
        <strong>{props.dueDateLabel}:</strong>
        <br />
        {props.dueDate}
      </Text>
      <Button
        href={props.propertyUrl}
        style={{ backgroundColor: "#1d4ed8", color: "#ffffff", padding: "12px 20px", borderRadius: "6px" }}
      >
        View property
      </Button>
      <Text style={{ fontSize: "14px", color: "#616e7c" }}>
        RentCert calculates reminders from the dates you entered. Confirm the requirement that applies with your
        licensed provider or the official guidance for your state or territory.
      </Text>
      <Text style={{ fontSize: "14px", color: "#616e7c" }}>
        You can turn off reminder emails in <a href={props.accountUrl}>Account settings</a>.
      </Text>
    </EmailLayout>
  );
}
