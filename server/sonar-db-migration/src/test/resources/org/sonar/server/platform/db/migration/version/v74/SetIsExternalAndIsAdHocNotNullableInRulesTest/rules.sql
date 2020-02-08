CREATE TABLE "RULES" (
  "ID" INTEGER NOT NULL GENERATED BY DEFAULT AS IDENTITY (START WITH 1, INCREMENT BY 1),
  "PLUGIN_KEY" VARCHAR(200),
  "PLUGIN_RULE_KEY" VARCHAR(200) NOT NULL,
  "PLUGIN_NAME" VARCHAR(255) NOT NULL,
  "DESCRIPTION" VARCHAR(16777215),
  "DESCRIPTION_FORMAT" VARCHAR(20),
  "PRIORITY" INTEGER,
  "IS_TEMPLATE" BOOLEAN DEFAULT FALSE,
  "IS_EXTERNAL" BOOLEAN,
  "IS_AD_HOC" BOOLEAN,
  "TEMPLATE_ID" INTEGER,
  "PLUGIN_CONFIG_KEY" VARCHAR(200),
  "NAME" VARCHAR(200),
  "STATUS" VARCHAR(40),
  "LANGUAGE" VARCHAR(20),
  "SCOPE" VARCHAR(20) NOT NULL,
  "DEF_REMEDIATION_FUNCTION" VARCHAR(20),
  "DEF_REMEDIATION_GAP_MULT" VARCHAR(20),
  "DEF_REMEDIATION_BASE_EFFORT" VARCHAR(20),
  "GAP_DESCRIPTION" VARCHAR(4000),
  "SYSTEM_TAGS" VARCHAR(4000),
  "SECURITY_STANDARDS" VARCHAR(4000),
  "RULE_TYPE" TINYINT,
  "CREATED_AT" BIGINT,
  "UPDATED_AT" BIGINT
);
CREATE UNIQUE INDEX "RULES_REPO_KEY" ON "RULES" ("PLUGIN_NAME", "PLUGIN_RULE_KEY");