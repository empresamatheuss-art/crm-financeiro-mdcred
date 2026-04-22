window.CRM_MONITORING_CONFIG = window.CRM_MONITORING_CONFIG || {
  sentry: {
    dsn: "",
    environment: "production",
    release: "crm-financeiro-mdcred@1.0.0",
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
  },
  analytics: {
    enabled: false,
    scriptPath: "",
    debug: false,
  },
  edgeFunctions: {
    enabled: false,
    exportReportName: "export-report",
    automationName: "sales-automation",
  },
};
