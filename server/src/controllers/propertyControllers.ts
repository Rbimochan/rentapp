// @ts-nocheck
import { Request, Response } from "express";
import oracledb from "oracledb";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";
import {
  parseJsonArray,
  toOracleJsonArray,
  normalizeBoolean,
  toNumber,
} from "../utils/oracleUtils";
import { withOracleConnection, withOracleTransaction } from "../db/oracle";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

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
  managerName?: string;
  managerEmail?: string;
  managerPhoneNumber?: string;
};

const mapPropertyRow = (row: PropertyRow) => {
  return {
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
    manager: row.managerName
      ? {
          cognitoId: row.managerCognitoId,
          name: row.managerName,
          email: row.managerEmail,
          phoneNumber: row.managerPhoneNumber,
        }
      : undefined,
  };
};

export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
    } = req.query;

    const whereClauses: string[] = [];
    const binds: Record<string, any> = {};

    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string)
        .split(",")
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));

      if (favoriteIdsArray.length > 0) {
        const placeholders = favoriteIdsArray.map((_, index) => {
          const key = `fav${index}`;
          binds[key] = favoriteIdsArray[index];
          return `:${key}`;
        });
        whereClauses.push(`p.id IN (${placeholders.join(", ")})`);
      }
    }

    if (priceMin) {
      binds.priceMin = Number(priceMin);
      whereClauses.push("p.price_per_month >= :priceMin");
    }

    if (priceMax) {
      binds.priceMax = Number(priceMax);
      whereClauses.push("p.price_per_month <= :priceMax");
    }

    if (beds && beds !== "any") {
      binds.beds = Number(beds);
      whereClauses.push("p.beds >= :beds");
    }

    if (baths && baths !== "any") {
      binds.baths = Number(baths);
      whereClauses.push("p.baths >= :baths");
    }

    if (squareFeetMin) {
      binds.squareFeetMin = Number(squareFeetMin);
      whereClauses.push("p.square_feet >= :squareFeetMin");
    }

    if (squareFeetMax) {
      binds.squareFeetMax = Number(squareFeetMax);
      whereClauses.push("p.square_feet <= :squareFeetMax");
    }

    if (propertyType && propertyType !== "any") {
      binds.propertyType = propertyType;
      whereClauses.push("p.property_type = :propertyType");
    }

    if (amenities && amenities !== "any") {
      const amenitiesArray = (amenities as string)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      amenitiesArray.forEach((amenity, index) => {
        const bindKey = `amenity${index}`;
        binds[bindKey] = amenity;
        whereClauses.push(
          `JSON_EXISTS(p.amenities, '$?(@ == $${bindKey})' PASSING :${bindKey} AS "${bindKey}")`
        );
      });
    }

    if (availableFrom && availableFrom !== "any") {
      const availableFromDate =
        typeof availableFrom === "string" ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          binds.availableFrom = date;
          whereClauses.push(
            `EXISTS (
              SELECT 1 FROM LEASE l
              WHERE l.property_id = p.id
              AND l.start_date <= :availableFrom
            )`
          );
        }
      }
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKilometers = 1000;
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        binds.latitude = lat;
        binds.longitude = lng;
        binds.radiusKm = radiusInKilometers;
        whereClauses.push(
          `(
            6371 * 2 * ASIN(
              SQRT(
                POWER(SIN((:latitude - l.latitude) * 0.017453292519943295 / 2), 2)
                + COS(:latitude * 0.017453292519943295)
                * COS(l.latitude * 0.017453292519943295)
                * POWER(SIN((:longitude - l.longitude) * 0.017453292519943295 / 2), 2)
              )
            )
          ) <= :radiusKm`
        );
      }
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
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
      ${whereSql}
    `;

    const properties = await withOracleConnection(async (connection) => {
      const result = await connection.execute<PropertyRow>(query, binds);
      return (result.rows || []).map(mapPropertyRow);
    });

    res.json(properties);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving properties: ${error.message}` });
  }
};

export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);
    if (!Number.isFinite(propertyId)) {
      res.status(400).json({ message: "Invalid property id." });
      return;
    }

    const property = await withOracleConnection(async (connection) => {
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
          l.longitude as "locationLongitude",
          m.name as "managerName",
          m.email as "managerEmail",
          m.phone_number as "managerPhoneNumber"
        FROM PROPERTY p
        JOIN LOCATION l ON p.location_id = l.id
        JOIN MANAGER m ON p.manager_cognito_id = m.cognito_id
        WHERE p.id = :propertyId
        `,
        { propertyId }
      );

      const row = result.rows?.[0];
      return row ? mapPropertyRow(row) : null;
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    res.json(property);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error retrieving property: ${err.message}` });
  }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId,
      ...propertyData
    } = req.body;

    const photoUrls = await Promise.all(
      (files || []).map(async (file) => {
        const uploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `properties/${Date.now()}-${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const uploadResult = await new Upload({
          client: s3Client,
          params: uploadParams,
        }).done();

        return uploadResult.Location as string;
      })
    );

    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        street: address,
        city,
        country,
        postalcode: postalCode,
        format: "json",
        limit: "1",
      }
    ).toString()}`;
    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: {
        "User-Agent": "RealEstateApp (justsomedummyemail@gmail.com",
      },
    });
    const [longitude, latitude] =
      geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat
        ? [
            parseFloat(geocodingResponse.data[0]?.lon),
            parseFloat(geocodingResponse.data[0]?.lat),
          ]
        : [0, 0];

    const propertyId = await withOracleTransaction(async (connection) => {
      const locationResult = await connection.execute(
        `
        INSERT INTO LOCATION (address, city, state, country, postal_code, latitude, longitude)
        VALUES (:address, :city, :state, :country, :postalCode, :latitude, :longitude)
        RETURNING id INTO :id
        `,
        {
          address,
          city,
          state,
          country,
          postalCode,
          latitude,
          longitude,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      const locationId =
        Array.isArray(locationResult.outBinds?.id)
          ? locationResult.outBinds?.id[0]
          : locationResult.outBinds?.id;

      if (!locationId) {
        throw new Error("Failed to create location.");
      }

      const propertyResult = await connection.execute(
        `
        INSERT INTO PROPERTY (
          name,
          description,
          price_per_month,
          security_deposit,
          application_fee,
          photo_urls,
          amenities,
          highlights,
          is_pets_allowed,
          is_parking_included,
          beds,
          baths,
          square_feet,
          property_type,
          location_id,
          manager_cognito_id
        )
        VALUES (
          :name,
          :description,
          :pricePerMonth,
          :securityDeposit,
          :applicationFee,
          :photoUrls,
          :amenities,
          :highlights,
          :isPetsAllowed,
          :isParkingIncluded,
          :beds,
          :baths,
          :squareFeet,
          :propertyType,
          :locationId,
          :managerCognitoId
        )
        RETURNING id INTO :id
        `,
        {
          name: propertyData.name,
          description: propertyData.description,
          pricePerMonth: toNumber(propertyData.pricePerMonth),
          securityDeposit: toNumber(propertyData.securityDeposit),
          applicationFee: toNumber(propertyData.applicationFee),
          photoUrls: toOracleJsonArray(photoUrls),
          amenities: toOracleJsonArray(propertyData.amenities),
          highlights: toOracleJsonArray(propertyData.highlights),
          isPetsAllowed: normalizeBoolean(propertyData.isPetsAllowed),
          isParkingIncluded: normalizeBoolean(propertyData.isParkingIncluded),
          beds: toNumber(propertyData.beds),
          baths: toNumber(propertyData.baths),
          squareFeet: toNumber(propertyData.squareFeet),
          propertyType: propertyData.propertyType,
          locationId,
          managerCognitoId,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      const insertedPropertyId =
        Array.isArray(propertyResult.outBinds?.id)
          ? propertyResult.outBinds?.id[0]
          : propertyResult.outBinds?.id;

      if (!insertedPropertyId) {
        throw new Error("Failed to create property.");
      }

      return Number(insertedPropertyId);
    });

    const property = await withOracleConnection(async (connection) => {
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
          l.longitude as "locationLongitude",
          m.name as "managerName",
          m.email as "managerEmail",
          m.phone_number as "managerPhoneNumber"
        FROM PROPERTY p
        JOIN LOCATION l ON p.location_id = l.id
        JOIN MANAGER m ON p.manager_cognito_id = m.cognito_id
        WHERE p.id = :propertyId
        `,
        { propertyId }
      );

      const row = result.rows?.[0];
      return row ? mapPropertyRow(row) : null;
    });

    if (!property) {
      res.status(404).json({ message: "Property not found after creation." });
      return;
    }

    res.status(201).json(property);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error creating property: ${err.message}` });
  }
};