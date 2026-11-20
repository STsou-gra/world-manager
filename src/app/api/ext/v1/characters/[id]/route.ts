import { detailResponse } from '../../../../../../lib/ext-api/resources';
import { withApiUser } from '../../../../../../lib/ext-api/with-api-user';

// 外部連携 API（読み取り専用。トークン認証）: 詳細
export const GET = withApiUser<{ id: string }>(({ db, params }) => detailResponse(db, 'characters', params.id));
