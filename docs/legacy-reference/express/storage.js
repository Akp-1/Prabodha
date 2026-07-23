const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = 'prabodha-files';

/**
 * Uploads a buffer (from multer) to Supabase Storage and returns its public URL.
 * Path shape: {institute_id}/{folder}/{random}-{original filename}
 * — namespacing by institute keeps files organized and makes it obvious
 * which institute a file belongs to just from the path.
 */
async function uploadFile({ instituteId, folder, file }) {
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${instituteId}/${folder}/${crypto.randomBytes(8).toString('hex')}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

module.exports = { uploadFile, deleteFile, BUCKET };
