// src/components/InstructionContent.jsx
import React from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  VStack,
  List,
  ListItem,
  ListIcon,
  Image,
  Divider,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { CheckCircleIcon, WarningTwoIcon, InfoOutlineIcon } from "@chakra-ui/icons";
import { FaPlay, FaStop } from "react-icons/fa";

/** Simple, compact instruction content. NO Modal here. */
export default function InstructionContent() {
  return (
    <Box w="100%" bg="white">
      {/* Title */}
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Anleitung</Heading>
        <Badge px={3} py={1} rounded="full">AI Academia</Badge>
      </HStack>

      {/* 2 columns on md+, single column on small */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} alignItems="start">
        {/* LEFT — Text */}
        <VStack align="stretch" spacing={6}>
          <Box>
            <HStack mb={2}>
              <Icon as={WarningTwoIcon} />
              <Heading size="md">Sicherheitshinweise</Heading>
            </HStack>
            <List spacing={1} fontSize="sm">
              <ListItem><ListIcon as={CheckCircleIcon} color="green.500" />Überprüfen Sie, ob Sattel und Lenker sicher befestigt sind.</ListItem>
              <ListItem><ListIcon as={CheckCircleIcon} color="green.500" />Tragen Sie geeignete, geschlossene Schuhe.</ListItem>
              <ListItem><ListIcon as={CheckCircleIcon} color="green.500" />Kinder nur mit Aufsicht nutzen; Mindestgröße 128&nbsp;cm.</ListItem>
              <ListItem><ListIcon as={CheckCircleIcon} color="green.500" />Nicht benutzen, wenn das Ergometer nass oder instabil ist.</ListItem>
              <ListItem><ListIcon as={CheckCircleIcon} color="green.500" />Bei Schwindel/Unwohlsein abbrechen.</ListItem>
            </List>
          </Box>

          <Box>
            <HStack mb={2}>
              <Icon as={InfoOutlineIcon} />
              <Heading size="md">Sattel &amp; Lenker einstellen</Heading>
            </HStack>

            <Heading size="sm" mb={1}>Sattelhöhe</Heading>
            <Text fontSize="sm" mb={2}>
              Bein in unterster Pedalstellung leicht gebeugt. Minimale Sattelhöhe: <b>73&nbsp;cm</b> (Innenbein ca. 66–89&nbsp;cm).
            </Text>
            <List spacing={1} fontSize="sm" mb={3}>
              <ListItem>1) Sperrriegel nach unten drücken</ListItem>
              <ListItem>2) Sattel in gewünschte Höhe bewegen</ListItem>
              <ListItem>3) Sperrriegel wieder loslassen</ListItem>
            </List>

            <Heading size="sm" mb={1}>Lenkerhöhe &amp; Vorbaulänge</Heading>
            <Text fontSize="sm" mb={2}>
              Vertikal & horizontal verstellbar. Lenkerhöhe ca. <b>56,5–77&nbsp;cm</b>.
            </Text>
            <List spacing={1} fontSize="sm">
              <ListItem><b>Höhe:</b> untere Schraube lösen → Sperrriegel drücken → Höhe einstellen → Sperrriegel loslassen → Schraube leicht anziehen</ListItem>
              <ListItem><b>Vorbaulänge:</b> obere Schraube lösen → Position einstellen → Schraube leicht anziehen</ListItem>
            </List>
          </Box>

          <Box>
            <HStack mb={2}>
              <Icon as={InfoOutlineIcon} />
              <Heading size="md">Mission starten &amp; Energie erzeugen</Heading>
            </HStack>
            <List spacing={1} fontSize="sm">
              <ListItem>1) Sattel &amp; Lenker bequem einstellen</ListItem>
              <ListItem>2) Aufsitzen und auf den Bildschirm schauen</ListItem>
              <ListItem>3) <b>START</b> drücken (grüne Taste oben links)</ListItem>
              <ListItem>4) Losradeln – Live-Werte erscheinen</ListItem>
              <ListItem>5) KI-Aufgaben freischalten</ListItem>
              <ListItem>6) Zum Beenden <b>STOP</b> drücken (rote Taste)</ListItem>
            </List>
          </Box>

          <Box>
            <HStack mb={2}>
              <Icon as={InfoOutlineIcon} />
              <Heading size="md">Freischaltbare KI-Aufgaben</Heading>
            </HStack>
            <List spacing={1} fontSize="sm">
              <ListItem>• 6 Suchanfragen an Google</ListItem>
              <ListItem>• Eine Bilderkennung</ListItem>
              <ListItem>• 20 einfache ChatGPT-Abfragen</ListItem>
              <ListItem>• Eine Text-zu-Sprache Umwandlung</ListItem>
            </List>
          </Box>
        </VStack>

        {/* RIGHT — Small images + START/STOP badges */}
        <VStack align="stretch" spacing={5}>
          <HStack spacing={4}>
            <HStack px={3} py={2} rounded="full" bg="green.500" color="white">
              <Icon as={FaPlay} />
              <Text fontWeight="bold">START</Text>
            </HStack>
            <HStack px={3} py={2} rounded="full" bg="red.500" color="white">
              <Icon as={FaStop} />
              <Text fontWeight="bold">STOP</Text>
            </HStack>
          </HStack>

          {/* Keep these images SMALL so the panel never scrolls */}
          <Box>
            <Heading size="sm" mb={1}>Lenker &amp; Vorbau</Heading>
            <Image
              src="/instructions/bike_overview.jpg"
              alt="BikeErg Übersicht"
              maxH="130px"
              w="100%"
              objectFit="contain"
              rounded="md"
              bg="white"
            />
          </Box>

          <Box>
            <Heading size="sm" mb={1}>Sattelsäule – Mechanik</Heading>
            <Image
              src="/instructions/saddle_lock.jpg"
              alt="Sattelsäule"
              maxH="130px"
              w="100%"
              objectFit="contain"
              rounded="md"
              bg="white"
            />
          </Box>

          <Box>
            <Heading size="sm" mb={1}>Grifflänge anpassen</Heading>
            <Image
              src="/instructions/handlebar_lock.jpg"
              alt="Lenker & Vorbau"
              maxH="130px"
              w="100%"
              objectFit="contain"
              rounded="md"
              bg="white"
            />
          </Box>

          <Divider />
          <Text fontSize="xs" color="gray.500">
            Hinweis: Dieses Ausstellungsstück verarbeitet keine personenbezogenen Daten. Es werden keinerlei Daten gespeichert oder aufgezeichnet.
          </Text>
        </VStack>
      </SimpleGrid>
    </Box>
  );
}
