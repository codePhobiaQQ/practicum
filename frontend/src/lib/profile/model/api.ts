import { wordpressAxios } from '@shared/lib/api/wordpress-axios'

export interface ProfileMetadata {
  user_id: number
  username: string
  email: string
  user_name: string
  group_number: string
}

export interface UpdateProfileMetadataPayload {
  user_name: string
  group_number: string
}

export async function getProfileMetadata(): Promise<ProfileMetadata> {
  const { data } = await wordpressAxios.get<ProfileMetadata>('/custom/v2/user/metadata')
  return data
}

export async function updateProfileMetadata(
  payload: UpdateProfileMetadataPayload,
): Promise<ProfileMetadata> {
  const { data } = await wordpressAxios.put<ProfileMetadata>('/custom/v2/user/metadata', payload)
  return data
}
