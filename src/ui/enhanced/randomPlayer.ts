import {
  CLASSIC_CATALOG,
  type ClassicCountryCode,
} from "../../domain/catalog/classicCatalog";
import {
  classicPick,
  classicRandomInteger,
  deriveClassicRngState,
} from "../../domain/classicRng";
import type {
  PlayerProfile,
  PositionCode,
} from "../../domain/model";

export type RandomPlayerSetup = Readonly<
  Omit<PlayerProfile, "nationality" | "position"> & {
    nationality: ClassicCountryCode;
    position: PositionCode;
  }
>;

const RANDOM_NAMES = [
  "新星·凌云",
  "新星·追风",
  "新星·晨光",
  "新星·远征",
  "新星·飞翼",
  "新星·磐石",
  "新星·逐梦",
  "新星·破晓",
] as const;

const RANDOM_POSITIONS = [
  "LW",
  "ST",
  "RW",
  "LM",
  "CAM",
  "RM",
  "LB",
  "CM",
  "RB",
  "CDM",
  "CB",
  "GK",
] as const satisfies readonly PositionCode[];

export function createRandomPlayerSetup(
  seed: string,
): RandomPlayerSetup {
  let state = deriveClassicRngState(
    seed,
    "enhanced-random-player",
  );
  const country = classicPick(
    state,
    CLASSIC_CATALOG.countries,
  );
  state = country.state;
  const name = classicPick(state, RANDOM_NAMES);
  state = name.state;
  const position = classicPick(state, RANDOM_POSITIONS);
  state = position.state;
  const foot = classicPick(state, ["left", "right"] as const);
  state = foot.state;
  const number = classicRandomInteger(state, 1, 99);

  return Object.freeze({
    foot: foot.item,
    name: name.item,
    nationality: country.item.fifaCode,
    number: String(number.value),
    position: position.item,
  });
}
