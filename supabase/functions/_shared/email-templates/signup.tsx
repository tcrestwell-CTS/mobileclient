/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Crestwell Travel Services — confirm your email</Preview>
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
        <Heading style={h1}>Welcome aboard!</Heading>
        <Text style={text}>
          We're excited to have you join{' '}
          <Link href={siteUrl} style={link}>
            <strong>Crestwell Travel Services</strong>
          </Link>
          . Let's get your account set up.
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirm My Email
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't create an account with Crestwell Travel Services, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#0f2b52', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#173b75',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '32px 0 20px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
