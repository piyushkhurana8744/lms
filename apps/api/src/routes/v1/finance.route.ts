import { Router } from 'express';
import { FinanceController } from '../../controllers/finance.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

// Secure all finance routes with authentication and tenant resolution
router.use(authenticate);
router.use(tenantResolverMiddleware);

// ==========================================
// 1. DASHBOARD & SUMMARY METRICS
// ==========================================
router.get(
  '/dashboard',
  requirePermission(PERMISSIONS.FINANCE_REPORT_VIEW),
  FinanceController.getDashboardMetrics
);
router.get('/readiness', requirePermission(PERMISSIONS.PAYMENT_GATEWAY_MANAGE), FinanceController.getFinanceReadiness);
router.get('/operations', requirePermission(PERMISSIONS.PAYMENT_RECONCILE), FinanceController.getFinanceOperations);

// ==========================================
// 2. FEE STRUCTURES (TEMPLATES)
// ==========================================
router.get(
  '/fee-structures',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.listFeeStructures
);

router.post(
  '/fee-structures',
  requirePermission(PERMISSIONS.FEE_STRUCTURE_MANAGE),
  FinanceController.createFeeStructure
);

router.get(
  '/fee-structures/:id',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.getFeeStructureById
);

// ==========================================
// 3. STUDENT FEE PLANS (CONTRACTUAL SNAPSHOTS)
// ==========================================
router.get(
  '/student-fees',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.getStudentFeePlans
);

router.post(
  '/student-fees',
  requirePermission(PERMISSIONS.FEE_PLAN_CREATE),
  FinanceController.createStudentFeePlan
);

router.get(
  '/student-fees/:id',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.getStudentFeePlanById
);

// ==========================================
// 4. PAYMENTS & ALLOCATIONS
// ==========================================
router.get(
  '/payments',
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  FinanceController.getPayments
);

router.post(
  '/payments/manual',
  requirePermission(PERMISSIONS.PAYMENT_COLLECT),
  FinanceController.recordManualPayment
);

router.post(
  '/payments/order',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.createOnlineOrder
);

router.post(
  '/payments/verify',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.verifyOnlinePayment
);

router.post(
  '/payments/:id/reverse',
  requirePermission(PERMISSIONS.PAYMENT_REFUND),
  FinanceController.reverseManualPayment
);
router.post('/payments/:id/reconcile', requirePermission(PERMISSIONS.PAYMENT_RECONCILE), FinanceController.reconcilePayment);

// ==========================================
// 5. RECEIPTS
// ==========================================
router.get(
  '/receipts',
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  FinanceController.getReceipts
);

router.get(
  '/receipts/:id',
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  FinanceController.getReceiptById
);
router.get('/receipts/:id/download', requirePermission(PERMISSIONS.PAYMENT_VIEW), FinanceController.downloadReceiptArtifact);

// ==========================================
// 6. DUES QUEUE
// ==========================================
router.get(
  '/dues',
  requirePermission(PERMISSIONS.FEE_VIEW),
  FinanceController.getDuesQueue
);

// ==========================================
// 7. REFUNDS
// ==========================================
router.get(
  '/refunds',
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  FinanceController.getRefunds
);

router.post(
  '/refunds',
  requirePermission(PERMISSIONS.PAYMENT_REFUND),
  FinanceController.requestRefund
);
router.post('/refunds/:id/reconcile', requirePermission(PERMISSIONS.PAYMENT_RECONCILE), FinanceController.reconcileRefund);

// ==========================================
// 8. PAYMENT GATEWAY SETTINGS
// ==========================================
router.get(
  '/settings/gateway',
  requirePermission(PERMISSIONS.PAYMENT_GATEWAY_MANAGE),
  FinanceController.getPaymentGatewayConfig
);

router.put(
  '/settings/gateway',
  requirePermission(PERMISSIONS.PAYMENT_GATEWAY_MANAGE),
  FinanceController.updatePaymentGatewayConfig
);

export default router;
