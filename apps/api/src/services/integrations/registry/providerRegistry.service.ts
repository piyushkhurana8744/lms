import { IntegrationProvider, IProviderMetadataDTO } from '@edtech/types';
import { LiveMeetingProvider } from '../contracts/liveMeetingProvider.contract';
import { AcademicPlatformProvider } from '../contracts/academicPlatformProvider.contract';
import { GoogleMeetAdapter } from '../adapters/googleMeet.adapter';
import { GoogleClassroomAdapter } from '../adapters/googleClassroom.adapter';
import { ZoomAdapter } from '../adapters/zoom.adapter';
import { MicrosoftTeamsAdapter } from '../adapters/microsoftTeams.adapter';
import { DeterministicLiveMeetingTestAdapter } from '../adapters/test/deterministicLiveMeetingTestAdapter';
import { DeterministicClassroomTestAdapter } from '../adapters/test/deterministicClassroomTestAdapter';
import { BadRequestError } from '../../../errors/appError';
import { ProviderOAuthConfigService } from '../security/providerOAuthConfig.service';

export class IntegrationProviderRegistry {
  private static liveMeetingProviders = new Map<IntegrationProvider, LiveMeetingProvider>();
  private static academicProviders = new Map<IntegrationProvider, AcademicPlatformProvider>();
  private static testAdaptersEnabled = process.env.NODE_ENV === 'test';

  private static deterministicMeetAdapter = new DeterministicLiveMeetingTestAdapter('GOOGLE_MEET');
  private static deterministicZoomAdapter = new DeterministicLiveMeetingTestAdapter('ZOOM');
  private static deterministicTeamsAdapter = new DeterministicLiveMeetingTestAdapter('MICROSOFT_TEAMS');
  private static deterministicClassroomAdapter = new DeterministicClassroomTestAdapter();

  static {
    this.registerDefaults();
  }

  private static registerDefaults() {
    this.liveMeetingProviders.set('GOOGLE_MEET', new GoogleMeetAdapter());
    this.liveMeetingProviders.set('ZOOM', new ZoomAdapter());
    this.liveMeetingProviders.set('MICROSOFT_TEAMS', new MicrosoftTeamsAdapter());
    this.academicProviders.set('GOOGLE_CLASSROOM', new GoogleClassroomAdapter());
  }

  public static setTestMode(enabled: boolean) {
    this.testAdaptersEnabled = enabled;
  }

  public static getDeterministicLiveAdapter(provider: IntegrationProvider): DeterministicLiveMeetingTestAdapter {
    if (provider === 'GOOGLE_MEET') return this.deterministicMeetAdapter;
    if (provider === 'ZOOM') return this.deterministicZoomAdapter;
    if (provider === 'MICROSOFT_TEAMS') return this.deterministicTeamsAdapter;
    throw new BadRequestError(`No deterministic live adapter for ${provider}`);
  }

  public static getDeterministicClassroomAdapter(): DeterministicClassroomTestAdapter {
    return this.deterministicClassroomAdapter;
  }

  public static getLiveMeetingProvider(provider: IntegrationProvider): LiveMeetingProvider {
    if (this.testAdaptersEnabled) {
      if (provider === 'GOOGLE_MEET') return this.deterministicMeetAdapter;
      if (provider === 'ZOOM') return this.deterministicZoomAdapter;
      if (provider === 'MICROSOFT_TEAMS') return this.deterministicTeamsAdapter;
    }
    const adapter = this.liveMeetingProviders.get(provider);
    if (!adapter) {
      throw new BadRequestError(`Unsupported or unregistered live meeting provider: ${provider}`);
    }
    return adapter;
  }

  public static getAcademicPlatformProvider(provider: IntegrationProvider): AcademicPlatformProvider {
    if (this.testAdaptersEnabled && provider === 'GOOGLE_CLASSROOM') {
      return this.deterministicClassroomAdapter;
    }
    const adapter = this.academicProviders.get(provider);
    if (!adapter) {
      throw new BadRequestError(`Unsupported or unregistered academic platform provider: ${provider}`);
    }
    return adapter;
  }

  public static getAllProviderMetadata(): IProviderMetadataDTO[] {
    const configuration = (provider: IntegrationProvider) => {
      const testReady = process.env.NODE_ENV === 'test' && process.env.ENABLE_INTEGRATION_TEST_ADAPTERS === 'true';
      const resolved = ProviderOAuthConfigService.resolve(provider);
      const ready = testReady || resolved.configured;
      const setupStatus = ready ? 'READY_TO_CONNECT' as const
        : resolved.missingConfiguration.length ? 'DEPLOYMENT_NOT_CONFIGURED' as const
        : 'INVALID_CONFIGURATION' as const;
      return {
        deploymentConfigured: ready,
        configurationStatus: ready ? 'READY' as const : 'SETUP_REQUIRED' as const,
        setupStatus,
        configurationMessage: ready
          ? 'Deployment configuration is valid. Connect an authorized provider account to continue.'
          : resolved.missingConfiguration.length
            ? `Deployment setup required. Missing server variables: ${resolved.missingConfiguration.join(', ')}.`
            : `Deployment configuration is invalid: ${resolved.invalidConfiguration.join(', ')}.`,
        missingConfiguration: testReady ? [] : resolved.missingConfiguration,
        invalidConfiguration: testReady ? [] : resolved.invalidConfiguration,
        callbackUrl: resolved.callbackUrl || undefined,
        webhookUrl: resolved.webhookUrl,
        requiredScopes: resolved.scopes,
        setupGuideUrl: provider === 'GOOGLE_CLASSROOM'
          ? 'https://developers.google.com/workspace/classroom/guides/auth'
          : provider === 'GOOGLE_MEET'
            ? 'https://developers.google.com/workspace/meet/api/guides/authenticate-authorize'
            : provider === 'ZOOM'
              ? 'https://developers.zoom.us/docs/integrations/create/'
              : 'https://learn.microsoft.com/graph/cloud-communication-online-meeting-application-access-policy',
        requiredAuthorization: provider === 'GOOGLE_CLASSROOM'
          ? 'Institute administrator with Google Classroom access'
          : 'Institute administrator or authorized live-class manager'
      };
    };
    return [
      {
        provider: 'GOOGLE_CLASSROOM',
        category: 'ACADEMIC_PLATFORM',
        displayName: 'Google Classroom',
        description: 'Synchronize courses, batches, rosters, assignments, and grades with Google Classroom',
        capabilities: {
          canCreateMeeting: false, canUpdateMeeting: false, canDeleteMeeting: false,
          canEndActiveConference: false, supportsCalendarEvents: false,
          supportsParticipantEvidence: false, supportsRecordingMetadata: false, supportsTranscriptMetadata: false,
          supportsUpdate: true,
          supportsCancel: true,
          supportsParticipants: true,
          supportsRecordings: false,
          supportsTranscripts: false,
          supportsWebhooks: true
        },
        supportedScopes: ['TENANT', 'BRANCH'],
        requiresOAuth: true,
        ...configuration('GOOGLE_CLASSROOM')
      },
      {
        provider: 'GOOGLE_MEET',
        category: 'LIVE_MEETING',
        displayName: 'Google Meet',
        description: 'Host and join interactive Google Meet sessions directly from scheduled classes',
        capabilities: {
          canCreateMeeting: true, canUpdateMeeting: false, canDeleteMeeting: false,
          canEndActiveConference: true, supportsCalendarEvents: false,
          supportsParticipantEvidence: true, supportsRecordingMetadata: true, supportsTranscriptMetadata: true,
          supportsUpdate: false,
          supportsCancel: false,
          supportsParticipants: true,
          supportsRecordings: true,
          supportsTranscripts: true,
          supportsWebhooks: false
        },
        supportedScopes: ['TENANT', 'BRANCH', 'USER'],
        requiresOAuth: true,
        ...configuration('GOOGLE_MEET')
      },
      {
        provider: 'ZOOM',
        category: 'LIVE_MEETING',
        displayName: 'Zoom Meetings',
        description: 'Enterprise Zoom live classes with host URL security, attendance evidence, and recording metadata',
        capabilities: {
          canCreateMeeting: true, canUpdateMeeting: true, canDeleteMeeting: true,
          canEndActiveConference: false, supportsCalendarEvents: false,
          supportsParticipantEvidence: true, supportsRecordingMetadata: true, supportsTranscriptMetadata: true,
          supportsUpdate: true,
          supportsCancel: true,
          supportsParticipants: true,
          supportsRecordings: true,
          supportsTranscripts: false,
          supportsWebhooks: true
        },
        supportedScopes: ['TENANT', 'BRANCH', 'USER'],
        requiresOAuth: true,
        ...configuration('ZOOM')
      },
      {
        provider: 'MICROSOFT_TEAMS',
        category: 'LIVE_MEETING',
        displayName: 'Microsoft Teams',
        description: 'Microsoft Graph Online Meetings integration for seamless institutional live classes',
        capabilities: {
          canCreateMeeting: true, canUpdateMeeting: true, canDeleteMeeting: true,
          canEndActiveConference: false, supportsCalendarEvents: false,
          supportsParticipantEvidence: true, supportsRecordingMetadata: true, supportsTranscriptMetadata: true,
          supportsUpdate: true,
          supportsCancel: true,
          supportsParticipants: true,
          supportsRecordings: true,
          supportsTranscripts: true,
          supportsWebhooks: false
        },
        supportedScopes: ['TENANT', 'BRANCH', 'USER'],
        requiresOAuth: true,
        ...configuration('MICROSOFT_TEAMS')
      }
    ];
  }
}
