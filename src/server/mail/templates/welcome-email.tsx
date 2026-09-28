import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./email-layout";

export function WelcomeEmail({ greetingName, addPropertyUrl }: { greetingName: string; addPropertyUrl: string }) {
  return (
    <EmailLayout preview="Add your first property and set up your compliance dates.">
      <Heading as="h1" style={{ fontSize: "22px" }}>
        Welcome to RentCert
      </Heading>
      <Text>Hi {greetingName},</Text>
      <Text>
        RentCert keeps your rental compliance dates and certificates in one place, and emails you before the dates you
        enter.
      </Text>
      <Text>
        Start by adding a property. Then tell us when each check was last done, and RentCert will work out your next
        reminder dates.
      </Text>
      <Button
        href={addPropertyUrl}
        style={{ backgroundColor: "#0a5c5c", color: "#ffffff", padding: "12px 22px", borderRadius: "999px", fontWeight: 600 }}
      >
        Add your first property
      </Button>
    </EmailLayout>
  );
}
