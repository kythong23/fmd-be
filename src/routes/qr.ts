import { Router } from 'express';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { badRequest } from '../errors.js';
import { assertSameFarm } from '../middleware/auth.js';
import { qrBatchBodySchema } from '../schemas.js';
import { query } from '../db/pool.js';
import { findTreeRow } from '../services/treeService.js';

export const qrRouter = Router();

/** D2: QR chỉ chứa URL `https://<domain>/tree/<code>`, không chứa dữ liệu nghiệp vụ. */
export const treeUrl = (code: string) => new URL(`/tree/${encodeURIComponent(code)}`, config.publicBaseUrl).toString();

qrRouter.get('/trees/:code/qr', async (req, res, next) => {
  try {
    const tree = await findTreeRow(req.params.code);
    assertSameFarm(req.user!, tree.farm_id);
    const url = treeUrl(tree.code);
    if (req.query.format === 'png') {
      res.type('png').send(await QRCode.toBuffer(url, { width: 512, margin: 1 }));
      return;
    }
    res.json({ code: tree.code, url, dataUrl: await QRCode.toDataURL(url, { width: 512, margin: 1 }) });
  } catch (err) {
    next(err);
  }
});

/** Xuất hàng loạt để in tem (01_REQUIREMENTS §3.5). FE tự lo layout + @media print. */
qrRouter.post('/qr/batch', async (req, res, next) => {
  try {
    const { codes, block } = qrBatchBodySchema.parse(req.body);
    const farmId = req.user?.farmId;
    if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');

    const { rows } = await query(
      `select code, bed_name, mound_number, block from trees
       where farm_id = $1 and ($2::text[] is null or code = any($2)) and ($3::text is null or block = $3)
       order by code asc limit 300`,
      [farmId, codes ?? null, block ?? null],
    );

    const items = await Promise.all(
      rows.map(async (r) => {
        const url = treeUrl(r.code);
        return {
          code: r.code,
          block: r.block,
          bedName: r.bed_name,
          moundNumber: r.mound_number,
          url,
          dataUrl: await QRCode.toDataURL(url, { width: 512, margin: 1 }),
        };
      }),
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
});
