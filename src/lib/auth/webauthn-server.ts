import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWebAuthnOrigin, getWebAuthnRpId, WEBAUTHN_RP_NAME } from "@/lib/auth/webauthn-config";

export type StoredCredential = {
  id: string;
  user_id: string;
  email: string;
  credential_id: string;
  public_key: string; // base64 from bytea
  counter: number;
  device_name: string | null;
  transports: string[] | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}


function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

export async function getCredentialsForEmail(email: string): Promise<StoredCredential[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("webauthn_credentials")
    .select("id, user_id, email, credential_id, public_key, counter, device_name, transports")
    .eq("email", normalizeEmail(email));

  return (data ?? []).map((row) => {
    const rawKey = row.public_key as unknown;
    let publicKeyBase64: string;

    if (typeof rawKey === "string") {
      const hex = rawKey.startsWith("\\x") ? rawKey.slice(2) : rawKey;
      publicKeyBase64 = Buffer.from(hex, "hex").toString("base64");
    } else if (rawKey instanceof ArrayBuffer) {
      publicKeyBase64 = Buffer.from(rawKey).toString("base64");
    } else {
      publicKeyBase64 = Buffer.from(rawKey as Uint8Array).toString("base64");
    }

    return {
      ...row,
      public_key: publicKeyBase64,
      counter: Number(row.counter),
    };
  });
}

export async function emailHasWebAuthn(email: string): Promise<boolean> {
  const creds = await getCredentialsForEmail(email);
  return creds.length > 0;
}

export async function buildRegistrationOptions(userId: string, email: string, deviceName?: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Admin no disponible");

  const normalized = normalizeEmail(email);

  const { data: existing } = await admin
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", userId);

  const excludeCredentials = (existing ?? []).map((c) => ({
    id: c.credential_id,
    transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_RP_NAME,
    rpID: getWebAuthnRpId(),
    userName: normalized,
    userDisplayName: deviceName || normalized,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  return { options, normalized };
}

export async function verifyRegistration(
  userId: string,
  email: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string
) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Admin no disponible");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("No se pudo verificar el registro biométrico");
  }

  const { credential, credentialDeviceType } = verification.registrationInfo;
  const normalized = normalizeEmail(email);

  const { error } = await admin.from("webauthn_credentials").insert({
    user_id: userId,
    email: normalized,
    credential_id: credential.id,
    public_key: `\\x${Buffer.from(credential.publicKey).toString("hex")}`,
    counter: credential.counter,
    device_name: deviceName || credentialDeviceType,
    transports: credential.transports ?? [],
  });

  if (error) throw new Error(error.message);
  return { verified: true };
}

export async function buildAuthenticationOptions(email: string) {
  const normalized = normalizeEmail(email);
  const credentials = await getCredentialsForEmail(normalized);

  if (credentials.length === 0) {
    throw new Error("No hay acceso biométrico registrado para este correo");
  }

  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpId(),
    allowCredentials: credentials.map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    })),
    userVerification: "required",
  });

  return { options, credentials, normalized };
}

export async function verifyAuthentication(
  email: string,
  response: AuthenticationResponseJSON,
  expectedChallenge: string
) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Admin no disponible");

  const normalized = normalizeEmail(email);
  const credentials = await getCredentialsForEmail(normalized);
  const credential = credentials.find((c) => c.credential_id === response.id);

  if (!credential) {
    throw new Error("Credencial biométrica no reconocida");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    requireUserVerification: true,
    credential: {
      id: credential.credential_id,
      publicKey: new Uint8Array(base64ToBuffer(credential.public_key)),
      counter: credential.counter,
      transports: (credential.transports ?? []) as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) {
    throw new Error("Verificación biométrica fallida");
  }

  const { authenticationInfo } = verification;

  await admin
    .from("webauthn_credentials")
    .update({
      counter: authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", credential.id);

  return { userId: credential.user_id, email: normalized };
}

export async function createSessionForUser(email: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Admin no disponible");

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalizeEmail(email),
  });

  if (error || !data?.properties?.hashed_token) {
    throw new Error("No se pudo crear la sesión");
  }

  return {
    token_hash: data.properties.hashed_token,
    email: normalizeEmail(email),
  };
}
