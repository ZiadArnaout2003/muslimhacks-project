import { supabase } from './supabaseClient'

async function upload(bucket: string, userId: string, file: File) {
  const path = `${userId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}

export const uploadTeacherDocument = (userId: string, file: File) => upload('teacher-documents', userId, file)
export const uploadFinancialAssistanceDocument = (userId: string, file: File) =>
  upload('financial-assistance-documents', userId, file)
export const uploadAssignmentFile = (studentId: string, file: File) =>
  upload('assignment-submissions', studentId, file)

/** Private buckets require a signed URL — never a public getPublicUrl(). */
export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}
