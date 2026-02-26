/**
 * Example: Drive Organizer
 * Organize Drive files into folders based on their MIME type.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { listFiles, createFolder, moveFile } from '@openworkspace/drive';

/** Maps a MIME type to a human-readable category name. */
function categorize(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Images';
  if (mimeType.startsWith('video/')) return 'Videos';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDFs';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheets';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Documents';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations';
  return 'Other';
}

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Step 1: List files in root (not in any folder, not folders themselves)
  const filesResult = await listFiles(http, {
    q: "'root' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false",
    pageSize: 100,
  });

  if (!filesResult.ok) {
    console.error('Failed to list files:', filesResult.error.message);
    return;
  }

  const files = filesResult.value.files ?? [];
  console.log(`Found ${files.length} files in root to organize`);

  // Step 2: Group files by category
  const groups = new Map<string, typeof files>();
  for (const file of files) {
    const category = categorize(file.mimeType ?? 'application/octet-stream');
    const list = groups.get(category) ?? [];
    list.push(file);
    groups.set(category, list);
  }

  // Step 3: Create folders and move files
  const folderCache = new Map<string, string>();

  for (const [category, categoryFiles] of groups) {
    if (category === 'Other') continue; // Skip uncategorized

    // Create the category folder (or reuse if already created)
    if (!folderCache.has(category)) {
      const folderResult = await createFolder(http, category);
      if (!folderResult.ok) {
        console.error(`Failed to create folder "${category}":`, folderResult.error.message);
        continue;
      }
      folderCache.set(category, folderResult.value.id);
    }

    const folderId = folderCache.get(category)!;
    console.log(`\n${category} (${categoryFiles.length} files):`);

    for (const file of categoryFiles) {
      const moveResult = await moveFile(http, file.id, { addParents: [folderId], removeParents: ['root'] });
      if (moveResult.ok) {
        console.log(`  Moved: ${file.name}`);
      }
    }
  }

  console.log('\nOrganization complete.');
}

main().catch(console.error);
