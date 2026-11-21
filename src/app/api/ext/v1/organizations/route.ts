import { listResponse } from '../../../../../lib/ext-api/resources';
import { withApiUser } from '../../../../../lib/ext-api/with-api-user';

// 外部連携 API（読み取り専用。トークン認証）: 一覧・一括取得
export const GET = withApiUser(({ request, db }) => listResponse(db, 'organizations', request.nextUrl.searchParams));
