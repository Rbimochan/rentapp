import { Request, Response } from "express";
import { withOracleConnection } from "../db/oracle";

type LeaseRow = {
  id: number;
  startDate: Date;
  endDate: Date;
  rent: number;
  deposit: number;
  propertyId: number;
  tenantCognitoId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhoneNumber: string;
  propertyName: string;
  propertyDescription: string;
};

type PaymentRow = {
  id: number;
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  paymentDate: Date;
  paymentStatus: string;
  leaseId: number;
};

export const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const leases = await withOracleConnection(async (connection) => {
      const result = await connection.execute<LeaseRow>(
        `
        SELECT
          l.id as "id",
          l.start_date as "startDate",
          l.end_date as "endDate",
          l.rent as "rent",
          l.deposit as "deposit",
          l.property_id as "propertyId",
          l.tenant_cognito_id as "tenantCognitoId",
          t.name as "tenantName",
          t.email as "tenantEmail",
          t.phone_number as "tenantPhoneNumber",
          p.name as "propertyName",
          p.description as "propertyDescription"
        FROM LEASE l
        JOIN TENANT t ON l.tenant_cognito_id = t.cognito_id
        JOIN PROPERTY p ON l.property_id = p.id
        `
      );

      return (result.rows || []).map((row) => ({
        id: row.id,
        startDate: row.startDate,
        endDate: row.endDate,
        rent: row.rent,
        deposit: row.deposit,
        propertyId: row.propertyId,
        tenantCognitoId: row.tenantCognitoId,
        tenant: {
          cognitoId: row.tenantCognitoId,
          name: row.tenantName,
          email: row.tenantEmail,
          phoneNumber: row.tenantPhoneNumber,
        },
        property: {
          id: row.propertyId,
          name: row.propertyName,
          description: row.propertyDescription,
        },
      }));
    });

    res.json(leases);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving leases: ${error.message}` });
  }
};

export const getLeasePayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const leaseId = Number(id);
    if (!Number.isFinite(leaseId)) {
      res.status(400).json({ message: "Invalid lease id." });
      return;
    }

    const payments = await withOracleConnection(async (connection) => {
      const result = await connection.execute<PaymentRow>(
        `
        SELECT
          id as "id",
          amount_due as "amountDue",
          amount_paid as "amountPaid",
          due_date as "dueDate",
          payment_date as "paymentDate",
          payment_status as "paymentStatus",
          lease_id as "leaseId"
        FROM PAYMENT
        WHERE lease_id = :leaseId
        `,
        { leaseId }
      );

      return result.rows || [];
    });

    res.json(payments);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving lease payments: ${error.message}` });
  }
};
