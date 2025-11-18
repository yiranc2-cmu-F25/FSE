import { jest } from "@jest/globals";

import HelpCenter from "../entities/HelpCenter.js";
import {
    getHelpCentersByUserId,
    getClosestHelpCenters,
    updateHelpCenter,
    deleteHelpCenter,
    registerHelpCenter,
} from "../controllers/helpCenterController.js";

function createMockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

//
// 1–2. getHelpCentersByUserId
//
describe("getHelpCentersByUserId", () => {
    test("should return 200 and the user's help centers", async () => {
        const mockCenters = [
            { name: "Shelter A", owner: "user123" },
            { name: "Food Center B", owner: "user123" },
        ];

        const spy = jest
            .spyOn(HelpCenter, "getHelpCenterByUserId")
            .mockResolvedValue(mockCenters);

        const req = { userId: "user123" };
        const res = createMockRes();

        await getHelpCentersByUserId(req, res);

        expect(spy).toHaveBeenCalledWith("user123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockCenters);
    });

    test("should return 500 when DAO throws an error", async () => {
        jest
            .spyOn(HelpCenter, "getHelpCenterByUserId")
            .mockRejectedValue(new Error("DB failure"));

        const req = { userId: "user123" };
        const res = createMockRes();

        await getHelpCentersByUserId(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Server error",
        });
    });
});

//
// 3–6. getClosestHelpCenters
//
describe("getClosestHelpCenters", () => {
    test("should return 400 when coordinates query param is missing", async () => {
        const req = { query: {} };
        const res = createMockRes();

        await getClosestHelpCenters(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "error",
                message: expect.stringMatching(/Missing query parameter: coordinates/i),
            })
        );
    });

    test("should return 400 when coordinates format is invalid", async () => {
        const req = { query: { coordinates: "-121.8863,37.3382,100" } };
        const res = createMockRes();

        await getClosestHelpCenters(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "error",
                message: expect.stringMatching(/Invalid coordinates format/i),
            })
        );
    });

    test("should return 400 when coordinates are out of bounds", async () => {
        const req = { query: { coordinates: "200,95" } }; // lon>180, lat>90
        const res = createMockRes();

        await getClosestHelpCenters(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "error",
                message: expect.stringMatching(/Coordinates out of bounds/i),
            })
        );
    });

    test("should return 200 and call DAO with parsed coordinates and default limit", async () => {
        const mockCenters = [{ name: "Near Shelter" }];

        const spy = jest
            .spyOn(HelpCenter, "getClosestHelpCenters")
            .mockResolvedValue(mockCenters);

        const req = {
            query: {
                coordinates: "-121.8863,37.3382",
                // no limit -> should default to 10
            },
        };
        const res = createMockRes();

        await getClosestHelpCenters(req, res);

        expect(spy).toHaveBeenCalledWith({
            coordinates: [-121.8863, 37.3382],
            limit: 10,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockCenters);
    });
});

//
// 7–8. updateHelpCenter
//
describe("updateHelpCenter", () => {
    test("should return 200 and updated help center when found", async () => {
        const updated = {
            _id: "abc123",
            name: "Updated Shelter",
            type: "shelter",
        };

        const spy = jest
            .spyOn(HelpCenter, "updateHelpCenter")
            .mockResolvedValue(updated);

        const req = {
        params: { id: "abc123" },
            body: {
                name: "Updated Shelter",
                type: "shelter",
                location: "123 Main",
                description: "desc",
                coordinates: [-121.88, 37.33],
            },
        };
        const res = createMockRes();

        await updateHelpCenter(req, res);

        expect(spy).toHaveBeenCalledWith({
            id: "abc123",
            name: "Updated Shelter",
            type: "shelter",
            location: "123 Main",
            description: "desc",
            coordinates: [-121.88, 37.33],
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updated);
    });

    test("should return 404 when help center does not exist", async () => {
        jest.spyOn(HelpCenter, "updateHelpCenter").mockResolvedValue(null);

        const req = {
            params: { id: "nonexistent" },
            body: {
                name: "Doesn't matter",
                type: "shelter",
                location: "X",
                description: "Y",
                coordinates: [-121, 37],
            },
        };
        const res = createMockRes();

        await updateHelpCenter(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Help center not found",
        });
    });
});

//
// 9. deleteHelpCenter
//
describe("deleteHelpCenter", () => {
    test("should return 200 and deleted help center when found", async () => {
        const deleted = { _id: "to-delete", name: "Old Shelter" };

        const spy = jest
            .spyOn(HelpCenter, "deleteHelpCenter")
            .mockResolvedValue(deleted);

        const req = { params: { id: "to-delete" } };
        const res = createMockRes();

        await deleteHelpCenter(req, res);

        expect(spy).toHaveBeenCalledWith("to-delete");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(deleted);
    });

    test("should return 404 when help center does not exist", async () => {
        jest.spyOn(HelpCenter, "deleteHelpCenter").mockResolvedValue(null);

        const req = { params: { id: "missing" } };
        const res = createMockRes();

        await deleteHelpCenter(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Help center not found",
        });
    });
});

//
// 10. registerHelpCenter
//
describe("registerHelpCenter", () => {
    test("should return 400 when create() throws a ValidationError", async () => {
        const validationError = new Error("Type is invalid");
        validationError.name = "ValidationError";

        // Mock the instance method on the prototype
        const createSpy = jest
            .spyOn(HelpCenter.prototype, "create")
            .mockRejectedValue(validationError);

        const req = {
            userId: "user123",
            body: {
                name: "Bad Shelter",
                type: "invalid-type",
                location: "Somewhere",
                description: "desc",
                coordinates: [-121.88, 37.33],
            },
        };
        const res = createMockRes();

        await registerHelpCenter(req, res);

        // We can't easily assert constructor args without a full mock, but we
        // can at least assert that create() was attempted and the error path was used.
        expect(createSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Type is invalid",
        });
    });
});
