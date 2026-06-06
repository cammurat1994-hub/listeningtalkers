import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "audio";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const token = process.env.CLOUDFLARE_R2_TOKEN!;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

    const ext = file.name.split(".").pop();
    const fileName = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();

    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${fileName}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: arrayBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ url: `${publicUrl}/${fileName}` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}