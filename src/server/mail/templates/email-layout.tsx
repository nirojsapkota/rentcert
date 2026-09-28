import { Body, Container, Head, Hr, Html, Preview, Text } from "@react-email/components";
import type { ReactNode } from "react";

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f3f6f2", fontFamily: "Arial, sans-serif", color: "#17312f" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", maxWidth: "560px", borderRadius: "16px" }}>
          <Text style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 24px" }}>RentCert</Text>
          {children}
          <Hr style={{ margin: "32px 0 16px" }} />
          <Text style={{ fontSize: "12px", color: "#4f6461" }}>
            RentCert is a record-keeping and reminder tool. It does not provide legal, electrical,
            gas, smoke alarm or other compliance advice.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
