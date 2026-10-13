/**
 * Standardized Operation Messages for CRUD and System Operations in DIDM LMS
 */
export const OPERATION_MESSAGES = {
  COURSE: {
    CREATE: {
      title: 'Creating Course',
      description: 'Please wait while we initialize your course...'
    },
    UPDATE: {
      title: 'Saving Course',
      description: 'Please wait while we save your course changes...'
    },
    DELETE: {
      title: 'Deleting Course',
      description: 'Please wait while we remove this course...'
    },
    PUBLISH: {
      title: 'Publishing Course',
      description: 'Making your course visible to students...'
    },
    UNPUBLISH: {
      title: 'Unpublishing Course',
      description: 'Updating course visibility...'
    }
  },
  MODULE: {
    CREATE: {
      title: 'Creating Module',
      description: 'Adding module to curriculum...'
    },
    UPDATE: {
      title: 'Saving Module',
      description: 'Saving module details...'
    },
    DELETE: {
      title: 'Removing Module',
      description: 'Deleting module from curriculum...'
    },
    REORDER: {
      title: 'Reordering Curriculum',
      description: 'Updating curriculum module order...'
    }
  },
  LESSON: {
    CREATE: {
      title: 'Creating Lesson',
      description: 'Adding lesson to module...'
    },
    UPDATE: {
      title: 'Saving Lesson',
      description: 'Saving lesson content and settings...'
    },
    DELETE: {
      title: 'Removing Lesson',
      description: 'Deleting lesson...'
    },
    REORDER: {
      title: 'Reordering Lessons',
      description: 'Updating lesson sequence...'
    }
  },
  MEDIA: {
    UPLOAD: {
      title: 'Uploading Media',
      description: 'Transferring file to media library...'
    },
    DELETE: {
      title: 'Deleting Media',
      description: 'Removing media asset...'
    },
    PROCESSING: {
      title: 'Processing Video',
      description: 'Optimizing video for streaming...'
    }
  },
  ORGANIZATION: {
    SETTINGS_SAVE: {
      title: 'Saving Organization Settings',
      description: 'Updating organization details...'
    },
    STORAGE_TEST: {
      title: 'Testing Storage Connection',
      description: 'Verifying bucket credentials and permissions...'
    },
    STORAGE_SAVE: {
      title: 'Saving Storage Configuration',
      description: 'Updating storage provider settings...'
    },
    CMS_SAVE: {
      title: 'Saving Website Changes',
      description: 'Saving CMS landing page content...'
    },
    CMS_PUBLISH: {
      title: 'Publishing Website',
      description: 'Deploying latest changes to live site...'
    }
  }
};
