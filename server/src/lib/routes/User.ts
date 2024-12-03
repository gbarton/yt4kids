import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import Logger from '../Log';
import { v7 } from 'uuid';
import { YTProfile, YTPassword, RecordTypes } from '../db/Types';
import getDB from '../db/DB';

const TOKEN_KEY = "x-cflr-token";
const PW_LENGTH = 4;

class User {

  constructor() {
    Logger.info("User obj online");
  }

  async exists(email: string) {
    const db = await getDB();
    const user = await db.findOne<YTProfile>(RecordTypes.USER_PROFILE, email);
    return user == null ? false : true;
  }

  async getProfile(email: string) {
    const DB = await getDB();
    return DB.findOne<YTProfile>(RecordTypes.USER_PROFILE, email);
  }

  async getPW(email: string) {
    const DB = await getDB();
    return DB.findOne<YTPassword>(RecordTypes.USER_PWHASH, email);
  }

  async getProfiles() {
    const DB = await getDB();
    return DB.find<YTProfile>(RecordTypes.USER_PROFILE, { limit: 100 });
  }

  async login(email: string, password: string) {
    Logger.info(`logging in ${email}`);
    const user = await this.getPW(email);
    
    if (user == null) return { success: false, message: 'User not found' }

    const isMatch = await Bun.password.verify(password, user.pwHash);
    Logger.info(isMatch);
    if (!isMatch) return { success: false, message: 'Invalid password' }
    const profile = await this.getProfile(email);

    return { success: true, email, profile }
  }

  async register(password: string, ytProfile: YTProfile) {
    if (await this.exists(ytProfile.email)) {
      return { success: false, message: 'User already exists' }
    }

    const hashedPassword = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 4
    });

    const DB = await getDB();
    const ytPW: YTPassword = {
      id: ytProfile.email,
      pwHash: hashedPassword,
      recordType: RecordTypes.USER_PWHASH,
    };

    await DB.insertOrUpdateObj(ytPW);
    await DB.insertOrUpdateObj(ytProfile);
    
    return { success: true, message: 'welcome!' }
  }
}

const UserManager = new User();

const jwtTokenType = t.Object({
  email: t.String(),
  token: t.String(),
  exp: t.Number(),
});

type JwtTokenType = typeof jwtTokenType.static;

// embeds the user class and the jwt parser
export const userService = new Elysia({name: 'user/service'})
  .decorate('users', UserManager)
  .use(
    jwt({
        name: 'jwt',
        // TODO: parameterize!
        secret: 'some really long string thats unique',
        // 1 week
        exp: '7d',
    })
  );

export const userGuard = new Elysia({name: 'loggedIn'})
   .use(userService)
   .guard({
      headers: t.Object({
        // TODO: hate this is hardcoded here vs the TOKEN_KEY
        'x-cflr-token': t.String()
      })
    })
    .resolve(async ({error, users, cookie: {auth}, headers, jwt}) => {
      Logger.info(auth, 'onBefore Triggered');
      // check the cookie is there
      if (!auth.value) {
        Logger.warn('no cookie present');
        return error(401, {
          success: false,
          message: 'you must be signed in to access this content'
        });
      }

      const verified = await jwt.verify(auth.value);
      // junk jwt or expired
      if (!verified) {
        return error(401, {
          success: false,
          message: 'you must be signed in to access this content 1',
        });
      }
      // TODO: handle type conversion error
      const jwtToken = verified as JwtTokenType;
      // Logger.info(jwtToken);
      // Logger.info(headers, "headers");

      // check the token is there in the headers
      if (!headers[TOKEN_KEY]) {
        Logger.warn("no token present");
        return error(401, {
          success: false,
          message: 'you must be signed in to access this content 2',
        });
      }


      const token = headers[TOKEN_KEY];
      if (token !== jwtToken.token) {
        return error(401, {
          success: false,
          message: 'unauthorized',
        });
      }

      // lets load the profile so we can do role checks
      const profile = await users.getProfile(jwtToken.email)
      if (!profile) {
        return error(400, {
          success: false,
          message:'something went wrong',
        });
      }
      return {
        profile
      }
    })
   .as('plugin');

// // guards to ensure the user is actually logged in with valid token and cookie
// export const userGuards = new Elysia({name:'signin'})
//   .use(userService)
//   .macro(({onBeforeHandle}) => ({
//     // a function that if enabled will test for valid cookie
//     isSignIn(enabled: boolean) {
//       if (!enabled) return;

//       onBeforeHandle(
//         async ({error, cookie: {auth}, headers, jwt}) => {
//           Logger.info(auth, 'onBefore Triggered');
//           // check the cookie is there
//           if (!auth.value) {
//             Logger.warn('no cookie present');
//             return error(401, {
//               success: false,
//               message: 'you must be signed in to access this content'
//             });
//           }

//           const verified = await jwt.verify(auth.value);
//           // junk jwt or expired
//           if (!verified) {
//             return error(401, {
//               success: false,
//               message: 'you must be signed in to access this content 1',
//             });
//           }
//           // TODO: handle type conversion error
//           const jwtToken = verified as JwtTokenType;
//           // Logger.info(jwtToken);
//           // Logger.info(headers, "headers");

//           // check the token is there in the headers
//           if (!headers[TOKEN_KEY]) {
//             Logger.warn("no token present");
//             return error(401, {
//               success: false,
//               message: 'you must be signed in to access this content 2',
//             });
//           }


//           const token = headers[TOKEN_KEY];
//           if (token !== jwtToken.token) {
//             return error(401, {
//               success: false,
//               message: 'unauthorized',
//             });
//           }
          
//         }
//       )
//     }
//   }))
//   .guard({
//     isSignIn: true,
//   })
//   .as('plugin'); // dunno what this does, but the onbefore wont trigger without it


export const adminGuard = new Elysia({name: "admin"})
.use(userGuard)
.guard({
  beforeHandle({profile, error}) {
    if (!profile) {
      return error(401, {
        success: false,
        message: 'you must be signed in to access this content 3',
      });
    }
    if (!profile.admin) {
      return error(401, {
        success: false,
        message: 'you must be an admin to access this content',
       });
     }
     Logger.info(`guard approved admin ${profile.displayName}`);
  }
})
.as('plugin'); // dunno what this does, but the onbefore wont trigger without it
  


// export const adminGuards = new Elysia({name:'admin'})
//   .use(userGuard)
//   .macro(({onBeforeHandle}) => ({
//     // a function that if enabled will test for valid cookie
//     isAdmin(enabled: boolean) {
//       if (!enabled) return;

//       onBeforeHandle(
//         async ({error, users, cookie: {auth}, jwt}) => {
//           //TODO: doing this twice, in the user guard and here...
//           const verified = await jwt.verify(auth.value);
//           // junk jwt or expired
//           if (!verified) {
//             return error(401, {
//               success: false,
//               message: 'you must be signed in to access this content 1',
//             });
//           }
//           // TODO: handle type conversion error
//           const jwtToken = verified as JwtTokenType;
//           const profile = await users.getProfile(jwtToken.email);
//           if (profile == null) {
//             return error(401, {
//               success: false,
//               message: 'you must be signed in to access this content 3',
//             });
//           }
//           if (!profile.admin) {
//             return error(401, {
//               success: false,
//               message: 'you must be an admin',
//             });
//           }
//       })
//     }
//   }))
//   .guard({
//     isAdmin: true,
//   })
//   .as('plugin');

export const UserEndpoints = new Elysia({ prefix: '/user' })
  .use(userService)
  .post('/register', async ({ redirect, users, body}) => {
    const { password, verifyPassword, email, displayName, admin } = body; 
    if (password != verifyPassword) {
      Logger.info('pw mismatch');
      return { success: false, message: 'Password mismatch' };
    }

    const userLists = await users.getProfiles();

    const ytProfile: YTProfile = {
      id: email,
      displayName,
      admin : admin == true ? true : userLists.length == 0 ? true : false,
      recordType: RecordTypes.USER_PROFILE,
      email,
    };

    const user = await users.register(password, ytProfile);
    if (user.success) {
      Logger.info(`registered user ${email}`);
      return { success: true, message: "ok" }
      // return redirect('#/login');
    } else {
      Logger.info('failed register');
      return { success: false, message: user.message }
    } 
    },
    {
      body: t.Object({
        email: t.String({
          format: 'email'
        }),
        displayName: t.String({minLength: 4}),
        password: t.String({minLength: PW_LENGTH}),
        verifyPassword: t.String({minLength: PW_LENGTH}),
        admin: t.Boolean({default: false}),
      })
    })
  .post('/login', 
    async ({ error, set, jwt, cookie: {auth}, body: {email, password}, users }) => {
      const user = await users.login(email, password);
      if (!user.success) {
        return error(401, { success: false, message: user.message });
      }
      
      const token = v7();
      // ? this is separate from the JWT date, should be close
      // ? enough, but would be nice to be able to grab the actual calculated one
      const exp = new Date().getTime() + (60 * 60 * 24 * 7);
      auth.set({
        value: await jwt.sign({email, token, exp}),
        httpOnly: true,
      });

      // set headers for our token
      set.headers[TOKEN_KEY] = token;
      Logger.info(`successfull login of user ${email}`);
      const profile = await users.getProfile(email);
      if (!profile) {
        return { success: false, message: 'Profile missing, you dont exist, find an admin' };
      }
      return { success: true, profile, exp }
    },
    {
      body: t.Object({
        email: t.String({
          format: 'email'
        }),
        password: t.String({minLength: PW_LENGTH})
      })
    }
  )
  .use(userGuard)
  .post('/logout', async({set, cookie: {auth}}) => {
    auth.set({
      value: '',
      httpOnly: true
    });
    return {success: true, message: 'logged out'}
  })
  .get('/users', async ({users}) => {
    return users.getProfiles();
  })
  .get('/profile', ({profile}) => profile)
