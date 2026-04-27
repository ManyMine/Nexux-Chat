/**
 * Provides client-side encryption/decryption for messages using AES-GCM.
 * This ensures that sensitive content is encrypted before being sent to Firebase.
 */

const KEY_NAME = 'message-encryption-key';

async function getKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(KEY_NAME);
  
  if (storedKey) {
    const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // Generate new key if none exists
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const exported = await crypto.subtle.exportKey("raw", key);
  const exportedArray = new Uint8Array(exported);
  const binaryString = String.fromCharCode(...exportedArray);
  localStorage.setItem(KEY_NAME, btoa(binaryString));
  
  return key;
}

export async function encrypt(text: string): Promise<{ ciphertext: string, iv: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

export async function decrypt(ciphertext: string, iv: string): Promise<string> {
  try {
    const key = await getKey();
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const dataArray = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivArray },
      key,
      dataArray
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", { e, ciphertext: ciphertext.substring(0, 10), iv: iv.substring(0, 10) });
    return "[Erro de descriptografia]";
  }
}
