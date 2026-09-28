import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./email-layout";

type Props = {
  preview: string;
  heading: string;
  greetingName: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
};

// One template for single-action emails (verify email, reset password).
export function ActionEmail(props: Props) {
  return (
    <EmailLayout preview={props.preview}>
      <Heading as="h1" style={{ fontSize: "22px" }}>
        {props.heading}
      </Heading>
      <Text>Hi {props.greetingName},</Text>
      <Text>{props.body}</Text>
      <Button
        href={props.actionUrl}
        style={{ backgroundColor: "#0a5c5c", color: "#ffffff", padding: "12px 22px", borderRadius: "999px", fontWeight: 600 }}
      >
        {props.actionLabel}
      </Button>
      <Text style={{ fontSize: "14px", color: "#4f6461" }}>{props.footnote}</Text>
    </EmailLayout>
  );
}
