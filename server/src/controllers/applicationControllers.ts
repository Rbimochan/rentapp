// @ts-nocheck
import { Request, Response } from "express";
import oracledb from "oracledb";
import { withOracleConnection, withOracleTransaction } from "../db/oracle";
import { parseJsonArray } from "../utils/oracleUtils";

type ApplicationRow = {
  id: number;
  applicationDate: Date;
  status: string;
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message: string | null;
  leaseId: number | null;
  propertyName: string;
  propertyDescription: string;
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
  managerName: string;
  managerEmail: string;
  managerPhoneNumber: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhoneNumber: string;
};

type LeaseRow = {
  id: number;
  startDate: Date;
  endDate: Date;
  rent: number;
  deposit: number;
  propertyId: number;
  tenantCognitoId: string;
};

const mapApplicationRow = (row: ApplicationRow, lease?: LeaseRow | null) => {
  const mappedLease = lease
    ? {
        ...lease,
        nextPaymentDate: calculateNextPaymentDate(lease.startDate),
      }
    : null;

  return {
    id: row.id,
    applicationDate: row.applicationDate,
    status: row.status,
    propertyId: row.propertyId,
    tenantCognitoId: row.tenantCognitoId,
    name: row.name,
    email: row.email,
    phoneNumber: row.phoneNumber,
    message: row.message,
    leaseId: row.leaseId,
    property: {
      id: row.propertyId,
      name: row.propertyName,
      description: row.propertyDescription,
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
      address: row.locationAddress,
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
    },
    manager: {
      cognitoId: row.managerCognitoId,
      name: row.managerName,
      email: row.managerEmail,
      phoneNumber: row.managerPhoneNumber,
    },
    tenant: {
      cognitoId: row.tenantCognitoId,
      name: row.tenantName,
      email: row.tenantEmail,
      phoneNumber: row.tenantPhoneNumber,
    },
    lease: mappedLease,
  };
};

const calculateNextPaymentDate = (startDate: Date): Date => {
  const today = new Date();
  const nextPaymentDate = new Date(startDate);
  while (nextPaymentDate <= today) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }
  return nextPaymentDate;
};

export const listApplications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, userType } = req.query;

    const whereClauses: string[] = [];
    const binds: Record<string, any> = {};

    if (userId && userType) {
      if (userType === "tenant") {
        whereClauses.push("a.tenant_cognito_id = :tenantCognitoId");
        binds.tenantCognitoId = String(userId);
      } else if (userType === "manager") {
        whereClauses.push("p.manager_cognito_id = :managerCognitoId");
        binds.managerCognitoId = String(userId);
      }
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const applications = await withOracleConnection(async (connection) => {
      const result = await connection.execute<ApplicationRow>(
        `
        SELECT
          a.id as "id",
          a.application_date as "applicationDate",
          a.status as "status",
          a.property_id as "propertyId",
          a.tenant_cognito_id as "tenantCognitoId",
          a.name as "name",
          a.email as "email",
          a.phone_number as "phoneNumber",
          a.message as "message",
          a.lease_id as "leaseId",
          p.name as "propertyName",
          p.description as "propertyDescription",
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
          m.phone_number as "managerPhoneNumber",
          t.name as "tenantName",
          t.email as "tenantEmail",
          t.phone_number as "tenantPhoneNumber"
        FROM APPLICATION a
        JOIN PROPERTY p ON a.property_id = p.id
        JOIN LOCATION l ON p.location_id = l.id
        JOIN MANAGER m ON p.manager_cognito_id = m.cognito_id
        JOIN TENANT t ON a.tenant_cognito_id = t.cognito_id
        ${whereSql}
        `,
        binds
      );

      return result.rows || [];
    });

    const formattedApplications = await Promise.all(
      applications.map(async (app) => {
        const lease = await withOracleConnection(async (connection) => {
          const leaseResult = await connection.execute<LeaseRow>(
            `
            SELECT
              id as "id",
              start_date as "startDate",
              end_date as "endDate",
              rent as "rent",
              deposit as "deposit",
              property_id as "propertyId",
              tenant_cognito_id as "tenantCognitoId"
            FROM LEASE
            WHERE tenant_cognito_id = :tenantCognitoId
              AND property_id = :propertyId
            ORDER BY start_date DESC
            FETCH FIRST 1 ROWS ONLY
            `,
            { tenantCognitoId: app.tenantCognitoId, propertyId: app.propertyId }
          );

          return leaseResult.rows?.[0] || null;
        });

        return mapApplicationRow(app, lease);
      })
    );

    res.json(formattedApplications);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving applications: ${error.message}` });
  }
};

export const createApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      applicationDate,
      status,
      propertyId,
      tenantCognitoId,
      name,
      email,
      phoneNumber,
      message,
    } = req.body;

    const property = await withOracleConnection(async (connection) => {
      const result = await connection.execute<{
        pricePerMonth: number;
        securityDeposit: number;
      }>(
        `
        SELECT
          price_per_month as "pricePerMonth",
          security_deposit as "securityDeposit"
        FROM PROPERTY
        WHERE id = :propertyId
        `,
        { propertyId }
      );

      return result.rows?.[0] || null;
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const newApplicationId = await withOracleTransaction(
      async (connection) => {
        const leaseResult = await connection.execute(
          `
          INSERT INTO LEASE (
            start_date,
            end_date,
            rent,
            deposit,
            property_id,
            tenant_cognito_id
          )
          VALUES (
            :startDate,
            :endDate,
            :rent,
            :deposit,
            :propertyId,
            :tenantCognitoId
          )
          RETURNING id INTO :id
          `,
          {
            startDate: new Date(),
            endDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            rent: property.pricePerMonth,
            deposit: property.securityDeposit,
            propertyId,
            tenantCognitoId,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );

        const leaseId = Array.isArray(leaseResult.outBinds?.id)
          ? leaseResult.outBinds?.id[0]
          : leaseResult.outBinds?.id;

        if (!leaseId) {
          throw new Error("Failed to create lease.");
        }

        const applicationResult = await connection.execute(
          `
          INSERT INTO APPLICATION (
            application_date,
            status,
            property_id,
            tenant_cognito_id,
            name,
            email,
            phone_number,
            message,
            lease_id
          )
          VALUES (
            :applicationDate,
            :status,
            :propertyId,
            :tenantCognitoId,
            :name,
            :email,
            :phoneNumber,
            :message,
            :leaseId
          )
          RETURNING id INTO :id
          `,
          {
            applicationDate: new Date(applicationDate),
            status,
            propertyId,
            tenantCognitoId,
            name,
            email,
            phoneNumber,
            message,
            leaseId,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );

        const applicationId = Array.isArray(applicationResult.outBinds?.id)
          ? applicationResult.outBinds?.id[0]
          : applicationResult.outBinds?.id;

        if (!applicationId) {
          throw new Error("Failed to create application.");
        }

        return Number(applicationId);
      }
    );

    const createdApplication = await withOracleConnection(
      async (connection) => {
        const result = await connection.execute<ApplicationRow>(
          `
          SELECT
            a.id as "id",
            a.application_date as "applicationDate",
            a.status as "status",
            a.property_id as "propertyId",
            a.tenant_cognito_id as "tenantCognitoId",
            a.name as "name",
            a.email as "email",
            a.phone_number as "phoneNumber",
            a.message as "message",
            a.lease_id as "leaseId",
            p.name as "propertyName",
            p.description as "propertyDescription",
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
            m.phone_number as "managerPhoneNumber",
            t.name as "tenantName",
            t.email as "tenantEmail",
            t.phone_number as "tenantPhoneNumber"
          FROM APPLICATION a
          JOIN PROPERTY p ON a.property_id = p.id
          JOIN LOCATION l ON p.location_id = l.id
          JOIN MANAGER m ON p.manager_cognito_id = m.cognito_id
          JOIN TENANT t ON a.tenant_cognito_id = t.cognito_id
          WHERE a.id = :applicationId
          `,
          { applicationId: newApplicationId }
        );

        return result.rows?.[0] || null;
      }
    );

    if (!createdApplication) {
      res.status(404).json({ message: "Application not found after creation." });
      return;
    }

    res.status(201).json(mapApplicationRow(createdApplication, null));
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating application: ${error.message}` });
  }
};

export const updateApplicationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const applicationId = Number(id);

    const application = await withOracleConnection(async (connection) => {
      const result = await connection.execute<ApplicationRow>(
        `
        SELECT
          a.id as "id",
          a.application_date as "applicationDate",
          a.status as "status",
          a.property_id as "propertyId",
          a.tenant_cognito_id as "tenantCognitoId",
          a.name as "name",
          a.email as "email",
          a.phone_number as "phoneNumber",
          a.message as "message",
          a.lease_id as "leaseId",
          p.name as "propertyName",
          p.description as "propertyDescription",
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
          m.phone_number as "managerPhoneNumber",
          t.name as "tenantName",
          t.email as "tenantEmail",
          t.phone_number as "tenantPhoneNumber"
        FROM APPLICATION a
        JOIN PROPERTY p ON a.property_id = p.id
        JOIN LOCATION l ON p.location_id = l.id
        JOIN MANAGER m ON p.manager_cognito_id = m.cognito_id
        JOIN TENANT t ON a.tenant_cognito_id = t.cognito_id
        WHERE a.id = :applicationId
        `,
        { applicationId }
      );

      return result.rows?.[0] || null;
    });

    if (!application) {
      res.status(404).json({ message: "Application not found." });
      return;
    }

    let newLease: LeaseRow | null = null;

    await withOracleTransaction(async (connection) => {
      if (status === "Approved") {
        const leaseResult = await connection.execute(
          `
          INSERT INTO LEASE (
            start_date,
            end_date,
            rent,
            deposit,
            property_id,
            tenant_cognito_id
          )
          VALUES (
            :startDate,
            :endDate,
            :rent,
            :deposit,
            :propertyId,
            :tenantCognitoId
          )
          RETURNING id INTO :id
          `,
          {
            startDate: new Date(),
            endDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            rent: application.pricePerMonth,
            deposit: application.securityDeposit,
            propertyId: application.propertyId,
            tenantCognitoId: application.tenantCognitoId,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );

        const leaseId = Array.isArray(leaseResult.outBinds?.id)
          ? leaseResult.outBinds?.id[0]
          : leaseResult.outBinds?.id;

        if (!leaseId) {
          throw new Error("Failed to create lease.");
        }

        newLease = {
          id: Number(leaseId),
          startDate: new Date(),
          endDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
          rent: application.pricePerMonth,
          deposit: application.securityDeposit,
          propertyId: application.propertyId,
          tenantCognitoId: application.tenantCognitoId,
        };

        await connection.execute(
          `
          MERGE INTO TENANT_PROPERTIES tp
          USING (SELECT :tenantCognitoId as tenant_cognito_id, :propertyId as property_id FROM dual) src
          ON (tp.tenant_cognito_id = src.tenant_cognito_id AND tp.property_id = src.property_id)
          WHEN NOT MATCHED THEN
            INSERT (tenant_cognito_id, property_id)
            VALUES (src.tenant_cognito_id, src.property_id)
          `,
          {
            tenantCognitoId: application.tenantCognitoId,
            propertyId: application.propertyId,
          }
        );

        await connection.execute(
          `
          UPDATE APPLICATION
          SET status = :status,
              lease_id = :leaseId
          WHERE id = :applicationId
          `,
          {
            status,
            leaseId,
            applicationId,
          }
        );
      } else {
        await connection.execute(
          `
          UPDATE APPLICATION
          SET status = :status
          WHERE id = :applicationId
          `,
          {
            status,
            applicationId,
          }
        );
      }
    });

    const updatedApplication = await withOracleConnection(
      async (connection) => {
        const result = await connection.execute<ApplicationRow>(
          `
          SELECT
            a.id as "id",
            a.application_date as "applicationDate",
            a.status as "status",
            a.property_id as "propertyId",
            a.tenant_cognito_id as "tenantCognitoId",
            a.name as "name",
            a.email as "email",
            a.phone_number as "phoneNumber",
            a.message as "message",
            a.lease_id as "leaseId",
            p.name as "propertyName",
            p.description as "propertyDescription",
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
            m.phone_number as "managerPhoneNumber",
            t.name as "tenantName",
            t.email as "tenantEmail",
            t.phone_number as "tenantPhoneNumber"
          FROM APPLICATION a
          JOIN PROPERTY p ON a.property_id = p.id
          JOIN LOCATION l ON p.location_id = l.id
          JOIN MANAGER m ON p.manager_cognito_id = m.cognito_id
          JOIN TENANT t ON a.tenant_cognito_id = t.cognito_id
          WHERE a.id = :applicationId
          `,
          { applicationId }
        );

        return result.rows?.[0] || null;
      }
    );

    if (!updatedApplication) {
      res.status(404).json({ message: "Application not found after update." });
      return;
    }
    res.json(mapApplicationRow(updatedApplication, newLease));
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating application status: ${error.message}` });
  }
};