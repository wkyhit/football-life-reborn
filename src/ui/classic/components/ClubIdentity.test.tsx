import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CLASSIC_CATALOG } from "../../../domain/catalog/classicCatalog";
import type { CareerClubPresentation } from "../careerPresentation";
import {
  CLASSIC_CREST_IDS,
  ClubIdentity,
  classicCrestUrl,
} from "./ClubIdentity";

const EXPECTED_CREST_IDS =
  "ac-milan.alaves.angers.arsenal.aston-villa.atalanta.athletic-bilbao.atletico-madrid.augsburg.auxerre.barcelona.bayern.beijing-guoan.bologna.bournemouth.brentford.brest.brighton.cagliari.celta-vigo.changchun-yatai.chelsea.chengdu-rongcheng.chongqing-tongliang.como.coventry.crystal-palace.dalian-yingbo.deportivo.dortmund.eintracht.elche.espanyol.everton.fiorentina.foshan-nanshi.freiburg.fulham.genoa.getafe.gladbach.guangxi-pingguo.hamburg.henan.hoffenheim.hubei-istar.hull.inter.ipswich.juventus.koln.lazio.le-havre.lecce.leeds.lens.levante.leverkusen.liaoning-tieren.lille.liverpool.lorient.lyon.mainz.man-city.man-utd.marseille.meizhou-hakka.monaco.nantong-zhiyun.napoli.newcastle.nice.nottingham.osasuna.paris-fc.parma.psg.qingdao-hainiu.qingdao-west-coast.racing-santander.rayo-vallecano.rb-leipzig.real-betis.real-madrid.real-sociedad.rennes.roma.sassuolo.sevilla.shaanxi-union.shandong-taishan.shanghai-port.shanghai-shenhua.shenzhen-peng-city.shijiazhuang.strasbourg.stuttgart.sunderland.suzhou-dongwu.tianjin-jinmen.torino.tottenham.toulouse.udinese.union-berlin.valencia.villarreal.werder.wuhan-three-towns.wuxi-wugou.yanbian-longding.yunnan-yukun.zhejiang".split(
    ".",
  );
const CREST_DIRECTORY = join(process.cwd(), "public", "crests");
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

describe("Classic club identity", () => {
  it("ships the exact 114 authorized local crest assets", () => {
    expect(CLASSIC_CREST_IDS).toEqual(EXPECTED_CREST_IDS);
    expect(new Set(CLASSIC_CREST_IDS).size).toBe(114);
    expect(
      CLASSIC_CREST_IDS.every((id) =>
        CLASSIC_CATALOG.clubById.has(id),
      ),
    ).toBe(true);
    expect(readdirSync(CREST_DIRECTORY).sort()).toEqual(
      EXPECTED_CREST_IDS.map((id) => `${id}.png`).sort(),
    );

    for (const id of EXPECTED_CREST_IDS) {
      const bytes = readFileSync(
        join(CREST_DIRECTORY, `${id}.png`),
      );
      expect(
        Array.from(bytes.subarray(0, 8)),
        `${id}.png must be a PNG`,
      ).toEqual(PNG_SIGNATURE);
    }
  });

  it("keeps its box stable and falls back after a crest load error", () => {
    const { container } = render(
      <ClubIdentity club={knownClub} size={34} />,
    );
    const mark = container.querySelector(
      "[data-classic-club-mark]",
    );
    const image = container.querySelector("img");

    expect(classicCrestUrl("arsenal")).toBe(
      "/crests/arsenal.png",
    );
    expect(mark).toHaveStyle({ height: "34px", width: "34px" });
    expect(mark).toHaveAttribute("data-crest-state", "image");
    expect(image).toHaveAttribute("loading", "lazy");

    fireEvent.error(image!);

    expect(mark).toHaveAttribute(
      "data-crest-state",
      "load-failure",
    );
    expect(mark).toHaveTextContent("ARS");
    expect(mark).toHaveStyle({ height: "34px", width: "34px" });
  });

  it("uses the deterministic abbreviation fallback for unknown IDs", () => {
    const club = { ...knownClub, id: "unlicensed-fixture" };
    const { container } = render(
      <ClubIdentity club={club} size={20} />,
    );
    const mark = container.querySelector(
      "[data-classic-club-mark]",
    );

    expect(classicCrestUrl(club.id)).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(mark).toHaveAttribute(
      "data-crest-state",
      "intentional-fallback",
    );
    expect(mark).toHaveTextContent("ARS");
    expect(mark).toHaveStyle({ height: "20px", width: "20px" });
  });
});

const knownClub: CareerClubPresentation = {
  abbreviation: "ARS",
  color: "#EF0107",
  id: "arsenal",
  name: "阿森纳",
  shortName: "阿森纳",
  subtitle: "英超",
};
