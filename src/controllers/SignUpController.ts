import { eq } from "drizzle-orm";
import z from "zod";
import { hash } from "bcryptjs";
import { db } from "../db";
import { usersTable } from "../db/schema";
import { HttpRequest, HttpResponse } from "../types/Http";
import { badRequest, conflict, created } from "../utils/http";
import { signAccessTokenFor } from "../lib/jwt";
import { calculateGoals } from "../lib/calculateGoals";

const schema = z.object({
  goal: z.enum(["lose", "maintain", "gain"]),
  gender: z.enum(["male", "female"]),
  birthDate: z.iso.date(),
  height: z.number(),
  weight: z.number(),
  activityLevel: z.number().min(1).max(5),
  account: z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
  }),
});

export class SignUpController {
  static async handle({ body }: HttpRequest): Promise<HttpResponse> {
    const { success, error, data } = schema.safeParse(body);

    if (!success) {
      return badRequest({ errors: error.issues });
    }

    // SELECT * FROM USERS WHERE ...
    // const user = db.select().from(usersTable).where({});
    const userAlreadyExists = await db.query.usersTable.findFirst({
      columns: {
        email: true,
      },
      where: eq(usersTable.email, data.account.email),
    });

    if (userAlreadyExists) {
      return conflict({ error: "This email is already in use." });
    }

    const { account, ...rest } = data;
    const goals = calculateGoals({
      activityLevel: rest.activityLevel,
      birthDate: new Date(rest.birthDate),
      gender: rest.gender,
      goal: rest.goal,
      height: rest.height,
      weight: rest.weight,
    });
    const hashedPassword = await hash(account.password, 8);
    // cost factor entre 8 e 12 é o ideal

    const [user] = await db
      .insert(usersTable)
      .values({
        ...account,
        ...rest,
        ...goals,
        password: hashedPassword,
        calories: 0,
        carbohydrates: 0,
        fats: 0,
        proteins: 0,
      })
      .returning({
        id: usersTable.id,
      });

    const accessToken = signAccessTokenFor(user.id);

    return created({
      accessToken,
    });
  }
}
