export const CLASSIC_CREST_IDS = Object.freeze(
  "ac-milan.alaves.angers.arsenal.aston-villa.atalanta.athletic-bilbao.atletico-madrid.augsburg.auxerre.barcelona.bayern.beijing-guoan.bologna.bournemouth.brentford.brest.brighton.cagliari.celta-vigo.changchun-yatai.chelsea.chengdu-rongcheng.chongqing-tongliang.como.coventry.crystal-palace.dalian-yingbo.deportivo.dortmund.eintracht.elche.espanyol.everton.fiorentina.foshan-nanshi.freiburg.fulham.genoa.getafe.gladbach.guangxi-pingguo.hamburg.henan.hoffenheim.hubei-istar.hull.inter.ipswich.juventus.koln.lazio.le-havre.lecce.leeds.lens.levante.leverkusen.liaoning-tieren.lille.liverpool.lorient.lyon.mainz.man-city.man-utd.marseille.meizhou-hakka.monaco.nantong-zhiyun.napoli.newcastle.nice.nottingham.osasuna.paris-fc.parma.psg.qingdao-hainiu.qingdao-west-coast.racing-santander.rayo-vallecano.rb-leipzig.real-betis.real-madrid.real-sociedad.rennes.roma.sassuolo.sevilla.shaanxi-union.shandong-taishan.shanghai-port.shanghai-shenhua.shenzhen-peng-city.shijiazhuang.strasbourg.stuttgart.sunderland.suzhou-dongwu.tianjin-jinmen.torino.tottenham.toulouse.udinese.union-berlin.valencia.villarreal.werder.wuhan-three-towns.wuxi-wugou.yanbian-longding.yunnan-yukun.zhejiang".split(
    ".",
  ),
);

const CLASSIC_CREST_ID_SET = new Set(CLASSIC_CREST_IDS);

export function classicCrestUrl(clubId: string): string | null {
  return CLASSIC_CREST_ID_SET.has(clubId)
    ? `/crests/${clubId}.png`
    : null;
}
