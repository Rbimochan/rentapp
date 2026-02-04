import { Request, Response } from "express";
import { withOracleConnection } from "../db/oracle";
import { parseJsonArray } from "../utils/oracleUtils";

type ManagerRow = {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
};

type PropertyRow = {
  id: number;
  name: string;
  description: string;
  pricePerMonth: number;
  securityDeposit: number;
  applicationFee: number;
  photoUrls: string;
  amenities: string;
  highlights: string;
  isPetsAllowed: number;
  isParkingIncluded: number;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: string;
  postedDate: Date;
  averageRating: number | null;
  numberOfReviews: number | null;
  locationId: number;
  managerCognitoId: string;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  locationPostalCode: string;
  locationLatitude: number;
  locationLongitude: number;
};

const mapPropertyRow = (row: PropertyRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  pricePerMonth: row.pricePerMonth,
  securityDeposit: row.securityDeposit,
  applicationFee: row.applicationFee,
  photoUrls: parseJsonArray<string>(row.photoUrls),
  amenities: parseJsonArray<string>(row.amenities),
  highlights: parseJsonArray<string>(row.highlights),
  isPetsAllowed: row.isPetsAllowed === 1,
  isParkingIncluded: row.isParkingIncluded === 1,
  beds: row.beds,
  baths: row.baths,
  squareFeet: row.squareFeet,
  propertyType: row.propertyType,
  postedDate: row.postedDate,
  averageRating: row.averageRating ?? 0,
  numberOfReviews: row.numberOfReviews ?? 0,
  locationId: row.locationId,
  managerCognitoId: row.managerCognitoId,
  location: {
    id: row.locationId,
    address: row.locationAddress,
    city: row.locationCity,
    state: row.locationState,
    country: row.locationCountry,
    postalCode: row.locationPostalCode,
    coordinates: {
      longitude: row.locationLongitude,
      latitude: row.locationLatitude,
    },
  },
});

export const getManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const manager = await withOracleConnection(async (connection) => {
      const result = await connection.execute<ManagerRow>(
        `
        SELECT
          id as "id",
          cognito_id as "cognitoId",
          name as "name",
          email as "email",
          phone_number as "phoneNumber"
        FROM MANAGER
        WHERE cognito_id = :cognitoId
        `,
        { cognitoId }
      );

      return result.rows?.[0] || null;
    });

    if (manager) {
      res.json(manager);
    } else {
      res.status(404).json({ message: "Manager not found" });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving manager: ${error.message}` });
  }
};

export const createManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    const manager = await withOracleConnection(async (connection) => {
      await connection.execute(
        `
        INSERT INTO MANAGER (cognito_id, name, email, phone_number)
        VALUES (:cognitoId, :name, :email, :phoneNumber)
        `,
        { cognitoId, name, email, phoneNumber },
        { autoCommit: true }
      );

      const result = await connection.execute<ManagerRow>(
        `
        SELECT
          id as "id",
          cognito_id as "cognitoId",
          name as "name",
          email as "email",
          phone_number as "phoneNumber"
        FROM MANAGER
        WHERE cognito_id = :cognitoId
        `,
        { cognitoId }
      );

      return result.rows?.[0] || null;
    });

    res.status(201).json(manager);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating manager: ${error.message}` });
  }
};

export const updateManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const updatedManager = await withOracleConnection(async (connection) => {
      await connection.execute(
        `
        UPDATE MANAGER
        SET name = :name,
            email = :email,
            phone_number = :phoneNumber
        WHERE cognito_id = :cognitoId
        `,
        { cognitoId, name, email, phoneNumber },
        { autoCommit: true }
      );

      const result = await connection.execute<ManagerRow>(
        `
        SELECT
          id as "id",
          cognito_id as "cognitoId",
          name as "name",
          email as "email",
          phone_number as "phoneNumber"
        FROM MANAGER
        WHERE cognito_id = :cognitoId
        `,
        { cognitoId }
      );

      return result.rows?.[0] || null;
    });

    res.json(updatedManager);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating manager: ${error.message}` });
  }
};

export const getManagerProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const properties = await withOracleConnection(async (connection) => {
      const result = await connection.execute<PropertyRow>(
        `
        SELECT
          p.id as "id",
          p.name as "name",
          p.description as "description",
          p.price_per_month as "pricePerMonth",
          p.security_deposit as "securityDeposit",
          p.application_fee as "applicationFee",
          p.photo_urls as "photoUrls",
          p.amenities as "amenities",
          p.highlights as "highlights",
          p.is_pets_allowed as "isPetsAllowed",
          p.is_parking_included as "isParkingIncluded",
          p.beds as "beds",
          p.baths as "baths",
          p.square_feet as "squareFeet",
          p.property_type as "propertyType",
          p.posted_date as "postedDate",
          p.average_rating as "averageRating",
          p.number_of_reviews as "numberOfReviews",
          p.location_id as "locationId",
          p.manager_cognito_id as "managerCognitoId",
          l.address as "locationAddress",
          l.city as "locationCity",
          l.state as "locationState",
          l.country as "locationCountry",
          l.postal_code as "locationPostalCode",
          l.latitude as "locationLatitude",
          l.longitude as "locationLongitude"
        FROM PROPERTY p
        JOIN LOCATION l ON p.location_id = l.id
        WHERE p.manager_cognito_id = :cognitoId
        `,
        { cognitoId }
      );

      return (result.rows || []).map(mapPropertyRow);
    });

    res.json(properties);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error retrieving manager properties: ${err.message}` });
  }
};
