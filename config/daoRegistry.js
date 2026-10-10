import * as schemas from "../db/index.js";
import * as daos from "../daos/index.js";
import * as dacs from "../dacs/index.js";

/**
 * Builds every Mongoose model on the given connection.
 * @param {import("mongoose").Connection} connection
 */
export function buildModels(connection) {
  return {
    UserModel: schemas.makeUserModel(connection),
    MessageModel: schemas.makeMsgModel(connection),
    AnnouncementModel: schemas.makeAnnouncementModel(connection),
    StatusModel: schemas.makeStatusModel(connection),
    HelpCenterModel: schemas.makeHelpCenterModel(connection),
    CoachingBoardModel: schemas.makeCoachingBoardModel(connection),
    CategorySkillPresetModel: schemas.makeCategorySkillPresetModel(connection),
    TaskModel: schemas.makeTaskModel(connection),
    TaskParticipantModel: schemas.makeTaskParticipantModel(connection),
    TaskLogModel: schemas.makeTaskLogModel(connection),
    GroupModel: schemas.makeGroupModel(connection),
    GroupMessageModel: schemas.makeGroupMessageModel(connection),
    EmergencyProfileModel: schemas.makeEmergencyProfileModel(connection),
    ProfilePhotoModel: schemas.makeProfilePhotoModel(connection),
    BookmarkModel: schemas.makeBookmarkModel(connection),
  };
}

/**
 * Creates the MongoDB-backed DAOs for the given connection and injects them
 * into their DACs. This is the production wiring; tests inject in-memory DAOs
 * into the same DACs instead.
 * @param {import("mongoose").Connection} connection
 * @returns the models that were built
 */
export function registerDaos(connection) {
  const m = buildModels(connection);

  dacs.UserDac.DAO = new daos.UserDao({ UserModel: m.UserModel });
  dacs.MsgDac.DAO = new daos.MsgDao({ MessageModel: m.MessageModel });
  dacs.AnnouncementDac.DAO = new daos.AnnouncementDao({
    AnnouncementModel: m.AnnouncementModel,
  });
  dacs.StatusDac.DAO = new daos.StatusDao({
    StatusModel: m.StatusModel,
    UserModel: m.UserModel,
  });
  dacs.HelpCenterDac.DAO = new daos.HelpCenterDao({
    HelpCenterModel: m.HelpCenterModel,
  });
  dacs.CoachingBoardDac.DAO = new daos.CoachingBoardDao({
    CoachingBoardModel: m.CoachingBoardModel,
  });
  dacs.CategorySkillPresetDac.DAO = new daos.CategorySkillPresetDao({
    CategorySkillPresetModel: m.CategorySkillPresetModel,
  });
  dacs.TaskDac.DAO = new daos.TaskDao({
    TaskModel: m.TaskModel,
    TaskParticipantModel: m.TaskParticipantModel,
    TaskLogModel: m.TaskLogModel,
  });
  dacs.GroupDac.DAO = new daos.GroupDao({ GroupModel: m.GroupModel });
  dacs.GroupMessageDac.DAO = new daos.GroupMessageDao({
    GroupMessageModel: m.GroupMessageModel,
  });
  dacs.EmergencyProfileDac.DAO = new daos.EmergencyProfileDao({
    EmergencyProfileModel: m.EmergencyProfileModel,
    ProfilePhotoModel: m.ProfilePhotoModel,
    UserModel: m.UserModel,
    BookmarkModel: m.BookmarkModel,
  });
  dacs.ProfilePhotoDac.DAO = new daos.ProfilePhotoDao({
    ProfilePhotoModel: m.ProfilePhotoModel,
  });

  return m;
}
