import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { AgreementPacketSnapshot } from "@/lib/agreements/types";
import {
  snapshotToDocumentBlocks,
  snapshotToSignedDocumentBlocks,
  type SignedAcceptanceRecord,
} from "@/lib/agreements/sections";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
    color: "#1e293b",
  },
  h1: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
  },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
});

function BlockView({
  block,
}: {
  block: ReturnType<typeof snapshotToDocumentBlocks>[number];
}) {
  if (block.kind === "heading") {
    if (block.level === 1) {
      return <Text style={styles.h1}>{block.text}</Text>;
    }
    return <Text style={styles.h2}>{block.text}</Text>;
  }
  if (block.kind === "list") {
    return (
      <View>
        {(block.items ?? []).map((item) => (
          <Text key={item} style={styles.listItem}>
            • {item}
          </Text>
        ))}
      </View>
    );
  }
  return <Text style={styles.paragraph}>{block.text}</Text>;
}

export function AgreementPacketPdfDocument({
  snapshot,
  acceptances,
}: {
  snapshot: AgreementPacketSnapshot;
  acceptances?: SignedAcceptanceRecord[];
}) {
  const blocks =
    acceptances && acceptances.length > 0
      ? snapshotToSignedDocumentBlocks(snapshot, acceptances)
      : snapshotToDocumentBlocks(snapshot);

  return (
    <Document title={`Agreement Packet ${snapshot.packetId}`}>
      <Page size="LETTER" style={styles.page} wrap>
        {blocks.map((block, index) => (
          <BlockView key={`${block.kind}-${index}`} block={block} />
        ))}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${snapshot.providerLegalName} · Packet ${snapshot.packetId} · Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
