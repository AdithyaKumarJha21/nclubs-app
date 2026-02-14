import { ReactElement } from "react";
import { Linking, Text } from "react-native";

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function renderTextWithLinks(
  text: string,
  linkColor: string
): ReactElement {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((chunk, index) => {
        const isUrlChunk = chunk.match(/^https?:\/\/[^\s]+$/i) || chunk.match(/^www\.[^\s]+$/i);

        if (!isUrlChunk) {
          return <Text key={`text-${index}`}>{chunk}</Text>;
        }

        return (
          <Text
            key={`link-${index}`}
            style={{ color: linkColor, textDecorationLine: "underline" }}
            onPress={async () => {
              const urlToOpen = chunk.startsWith("http") ? chunk : `https://${chunk}`;
              await Linking.openURL(urlToOpen);
            }}
          >
            {chunk}
          </Text>
        );
      })}
    </>
  );
}
