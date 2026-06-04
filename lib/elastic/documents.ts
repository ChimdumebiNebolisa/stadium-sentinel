import { operationalKnowledgeRecords } from "@/lib/data";
import type { OperationalKnowledgeDocument } from "@/lib/types";

export type IndexedOperationalDocument = OperationalKnowledgeDocument & {
  content: string;
};

export function getOperationalKnowledgeDocuments(): IndexedOperationalDocument[] {
  return operationalKnowledgeRecords.map((record) => ({
    ...record,
    content: [
      record.title,
      record.excerpt,
      record.body,
      record.rationale,
      record.locationNames.join(" "),
      record.terms.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  }));
}

export function getOperationalKnowledgeMapping() {
  return {
    mappings: {
      dynamic: "false",
      properties: {
        id: { type: "keyword" },
        sourceType: { type: "keyword" },
        title: { type: "text" },
        excerpt: { type: "text" },
        body: { type: "text" },
        rationale: { type: "text" },
        content: { type: "text" },
        incidentTypes: { type: "keyword" },
        categories: { type: "keyword" },
        locationIds: { type: "keyword" },
        locationNames: { type: "keyword" },
        priorityLevels: { type: "keyword" },
        terms: { type: "keyword" },
      },
    },
  };
}
