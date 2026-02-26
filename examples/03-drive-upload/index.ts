/**
 * Example: Drive Upload
 * Upload a file to Google Drive, then download it back.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { uploadFile, downloadFile, createFolder } from '@openworkspace/drive';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Step 1: Create a folder for our uploads
  const folderResult = await createFolder(http, 'OpenWorkspace Uploads');

  if (!folderResult.ok) {
    console.error('Failed to create folder:', folderResult.error.message);
    return;
  }

  const folderId = folderResult.value.id;
  console.log(`Created folder: ${folderResult.value.name} (${folderId})`);

  // Step 2: Upload a text file into the folder
  const content = new TextEncoder().encode('Hello from OpenWorkspace!\nThis file was uploaded programmatically.');
  const uploadResult = await uploadFile(http, {
    name: 'hello.txt',
    mimeType: 'text/plain',
    body: content,
    parents: [folderId],
  });

  if (!uploadResult.ok) {
    console.error('Upload failed:', uploadResult.error.message);
    return;
  }

  const fileId = uploadResult.value.id;
  console.log(`Uploaded file: ${uploadResult.value.name} (${fileId})`);

  // Step 3: Download the file back
  const downloadResult = await downloadFile(http, fileId);

  if (!downloadResult.ok) {
    console.error('Download failed:', downloadResult.error.message);
    return;
  }

  console.log('Downloaded content:');
  console.log(downloadResult.value);
}

main().catch(console.error);
