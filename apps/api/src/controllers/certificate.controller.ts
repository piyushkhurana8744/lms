import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CertificateService } from '../services/certificate.service';
import { CertificateArtifactService } from '../services/certificateArtifact.service';
const actor = (req: Request) => ({ userId: (req as AuthenticatedRequest).user!.userId });
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data, error: null });
async function send(res: Response, result: any) { if (result.buffer) { res.setHeader('Content-Type', result.mimeType); res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`); res.setHeader('Content-Length', String(result.buffer.length)); res.status(200).send(result.buffer); } else ok(res, result); }
export class CertificateController {
  static async eligibility(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.eligibility(String(req.query.enrollmentId || ''))); } catch (e) { next(e); } }
  static async issue(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.issue(req.body, actor(req)), 201); } catch (e) { next(e); } }
  static async list(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.list(req.query)); } catch (e) { next(e); } }
  static async revoke(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.revoke(String(req.params.id), req.body, actor(req))); } catch (e) { next(e); } }
  static async retry(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.retry(String(req.params.id), actor(req))); } catch (e) { next(e); } }
  static async adminDownload(req: Request, res: Response, next: NextFunction) { try { await send(res, await CertificateArtifactService.download(await CertificateService.getForDownload(String(req.params.id)))); } catch (e) { next(e); } }
  static async studentList(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.studentList((req as AuthenticatedRequest).user!.userId)); } catch (e) { next(e); } }
  static async studentDownload(req: Request, res: Response, next: NextFunction) { try { const userId = (req as AuthenticatedRequest).user!.userId; await send(res, await CertificateArtifactService.download(await CertificateService.getForDownload(String(req.params.id), userId))); } catch (e) { next(e); } }
  static async verify(req: Request, res: Response, next: NextFunction) { try { ok(res, await CertificateService.verify(String(req.params.code))); } catch (e) { next(e); } }
}
