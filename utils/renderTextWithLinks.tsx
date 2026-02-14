import { ReactElement } from "react";
import { Linking, Text } from "react-native";

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s]*)/gi;
const TRAILING_PUNCTUATION_REGEX = /[),.;!?]+$/;

export function renderTextWithLinks(
  text: string,
  linkColor: string
): ReactElement {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((chunk, index) => {
        const trailingPunctuation = chunk.match(TRAILING_PUNCTUATION_REGEX)?.[0] ?? "";
        const normalizedChunk = chunk.slice(0, chunk.length - trailingPunctuation.length);
        const isUrlChunk =
          normalizedChunk.match(/^https?:\/\/[^\s]+$/i) ||
          normalizedChunk.match(/^www\.[^\s]+$/i) ||
          normalizedChunk.match(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s]*$/i);

        if (!isUrlChunk) {
          return <Text key={`text-${index}`}>{chunk}</Text>;
        }

        return (
          <Text key={`link-${index}`}>
            <Text
              style={{ color: linkColor, textDecorationLine: "underline" }}
              onPress={async () => {
                const urlToOpen = normalizedChunk.startsWith("http")
                  ? normalizedChunk
                  : `https://${normalizedChunk}`;
                await Linking.openURL(urlToOpen);
              }}
            >
              {normalizedChunk}
            </Text>
            {trailingPunctuation ? <Text>{trailingPunctuation}</Text> : null}
          </Text>
        );
      })}
    </>
  );
}
