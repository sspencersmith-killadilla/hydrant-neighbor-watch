export async function fileToBase64(file: File): Promise<{ base64: string; contentType: string }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { base64: btoa(bin), contentType: file.type || "image/jpeg" };
}
