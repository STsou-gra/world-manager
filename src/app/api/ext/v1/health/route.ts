import { jsonOk } from '../../../../../lib/ext-api/responses';
import { withApiUser } from '../../../../../lib/ext-api/with-api-user';

// 外部連携 API: 疎通確認（トークンの確認を兼ねる）
export const GET = withApiUser(async () => jsonOk({ ok: true }));
