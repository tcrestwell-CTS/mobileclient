/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Crestwell Travel Services verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://zbtnulzvwreqzbmxulpv.supabase.co/storage/v1/object/public/email-assets/logo.png?v=1"
            alt="Crestwell Travel Services"
            width="180"
            style={{ margin: '0 auto' }}
          />
        </Section>
        <Heading style={h1}>Verify your identity</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Section style={codeSection}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '32px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f2b52',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#4c5562',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeSection = { textAlign: 'center' as const, margin: '24px 0' }
const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#0f2b52',
  letterSpacing: '6px',
  backgroundColor: '#f3f4f6',
  borderRadius: '12px',
  padding: '16px 24px',
  display: 'inline-block',
  border: '1px solid #e5e7eb',
}
const hr = { borderColor: '#e5e7eb', margin: '32px 0 20px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
