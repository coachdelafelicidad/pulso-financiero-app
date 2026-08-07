import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("webauthn_credentials")
    .select("id, device_name, created_at, last_used_at, transports")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ credentials: data ?? [] });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  let credentialId: string;
  try {
    const body = await request.json();
    credentialId = body.id;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!credentialId) {
    return NextResponse.json({ error: "ID de credencial requerido" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  }

  const { error } = await admin
    .from("webauthn_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
