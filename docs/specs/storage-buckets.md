# Storage 버킷 구성 (v1)

## 1. 버킷 목록
| 버킷 | 용도 | 접근 수준 | 예시 경로 |
| --- | --- | --- | --- |
| `crew-assets` | 크루 로고/배지 이미지 | Public read, 서비스 키/Edge write | `crew-assets/{crewId}/logo.png` |
| `records-raw` | 기록 업로드 원본 이미지 | Private, Edge Function write/read | `records-raw/{profileId}/{uuid}.jpg` |

## 2. 접근 정책
### crew-assets
```sql
create policy "Crew assets readable by anyone"
on storage.objects for select
using (
  bucket_id = 'crew-assets'
);

create policy "Crew assets manageable by service role"
on storage.objects for all
using (
  bucket_id = 'crew-assets' and auth.role() = 'service_role'
);
```
- 버킷은 Public으로 생성해 비로그인 사용자도 이미지를 볼 수 있게 한다.
- 업로드는 서비스 롤(Edge Function 또는 서버 클라이언트)이 signed URL 생성 후 수행.
- 클라이언트에서 signed URL로 PUT → 업로드 완료 후 `logo_image_url`에 경로 저장.

### records-raw
```sql
create policy "Records raw inserted by authenticated users"
on storage.objects for insert
with check (
  bucket_id = 'records-raw'
  and auth.role() = 'authenticated'
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "Records raw update by owner"
on storage.objects for update
using (
  bucket_id = 'records-raw' and auth.uid() = owner
)
with check (
  bucket_id = 'records-raw'
  and auth.uid() = owner
  and auth.uid()::text = split_part(name, '/', 1)
);

create policy "Records raw delete by owner"
on storage.objects for delete
using (
  bucket_id = 'records-raw' and auth.uid() = owner
);

create policy "Records raw readable by owner or service role"
on storage.objects for select
using (
  bucket_id = 'records-raw'
  and (auth.uid() = owner or auth.role() = 'service_role')
);
```
- 업로드 시 파일명 규칙: `{profileId}/{timestamp}_{원본파일명}`. 첫 세그먼트는 반드시 `profileId`와 동일해야 하며, 정책에서 이를 검증한다.
- 참가자가 직접 이미지를 교체할 수 있도록 update/delete는 오브젝트 소유자에게만 허용한다.
- Edge Function은 서비스 롤로 signed URL을 발급하고, 일반 사용자는 자신의 파일만 조회 가능하다.

## 3. 버킷 생성 절차
```bash
supabase storage create-bucket crew-assets --public=false
supabase storage create-bucket records-raw --public=false
```

## 4. 정리
- 정적 자산(로고)은 인증 사용자에게만 노출하여 크루 정보가 외부에 무분별하게 공개되지 않도록 한다.
- 기록 원본 이미지는 개인정보를 포함할 수 있으므로 철저히 비공개로 관리하며, 썸네일이나 통계용 이미지는 추후 별도 버킷에 저장.
