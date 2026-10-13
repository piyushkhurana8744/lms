import { Router } from 'express';
import { OrganizationWebsiteController } from '../../controllers/organizationWebsite.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Organization Website CMS Routes
router.get('/', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_VIEW), OrganizationWebsiteController.getWebsiteSettings);
router.get('/preview', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_VIEW), OrganizationWebsiteController.getWebsitePreview);

// Support both PATCH and PUT for Section 7 compatibility
router.patch('/branding', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateBranding);
router.put('/branding', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateBranding);

router.patch('/hero', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateHero);
router.put('/hero', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateHero);

router.patch('/homepage', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateHomepage);
router.put('/homepage', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateHomepage);

router.patch('/about', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateAbout);
router.put('/about', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateAbout);

router.patch('/contact', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateContact);
router.put('/contact', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateContact);

router.patch('/social', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateSocialLinks);
router.put('/social', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateSocialLinks);

router.patch('/footer', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateFooter);
router.put('/footer', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateFooter);

router.patch('/seo', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateSeo);
router.put('/seo', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateSeo);

router.patch('/navigation', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateNavigation);
router.put('/navigation', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE), OrganizationWebsiteController.updateNavigation);

router.post('/publish', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH), OrganizationWebsiteController.publishWebsite);
router.post('/unpublish', requirePermission(PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH), OrganizationWebsiteController.unpublishWebsite);

export default router;
