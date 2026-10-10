import {
  setupTestDbWithConnection,
  cleanupTestDbConnection,
} from "../config/testDbConfig.js";
import { registerDaos } from "../config/daoRegistry.js";
import * as dacs from "../dacs/index.js";
import * as daos from "../daos/index.js";

const EXPECTED_WIRING = [
  ["UserDac", "UserDao"],
  ["MsgDac", "MsgDao"],
  ["AnnouncementDac", "AnnouncementDao"],
  ["StatusDac", "StatusDao"],
  ["HelpCenterDac", "HelpCenterDao"],
  ["CoachingBoardDac", "CoachingBoardDao"],
  ["CategorySkillPresetDac", "CategorySkillPresetDao"],
  ["TaskDac", "TaskDao"],
  ["GroupDac", "GroupDao"],
  ["GroupMessageDac", "GroupMessageDao"],
  ["EmergencyProfileDac", "EmergencyProfileDao"],
  ["ProfilePhotoDac", "ProfilePhotoDao"],
];

describe("config/daoRegistry", () => {
  let conn;
  let models;

  beforeAll(async () => {
    ({ conn } = await setupTestDbWithConnection());
    models = registerDaos(conn);
  });

  afterAll(async () => {
    for (const Dac of Object.values(dacs)) {
      Dac.DAO = null;
    }
    await cleanupTestDbConnection(conn);
  });

  test("builds every model on the given connection", () => {
    expect(Object.keys(models)).toHaveLength(15);
    for (const model of Object.values(models)) {
      expect(model.db).toBe(conn);
    }
  });

  test.each(EXPECTED_WIRING)("injects a %s into %s", (dacName, daoName) => {
    expect(dacs[dacName].DAO).toBeInstanceOf(daos[daoName]);
  });

  test("every DAC exported by the barrel received a DAO", () => {
    for (const Dac of Object.values(dacs)) {
      expect(() => Dac.DAO).not.toThrow();
    }
  });
});
