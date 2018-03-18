const uuid = require("uuid");
const { pubsub } = require("subkit");

const ANGEBOTE = {};

export const resolvers = {
  Query: {
    angebote: async (
      parent,
      { skip = 0, take = 5 },
      { loaders, user: { username } },
      info
    ) => {
      const all = await loaders.angebote();
      return all.slice(skip, skip + take);
    },
    viewer: () => ({})
  },
  Mutation: {
    fahrtAnfragen: async (_, { input }, { loaders, user: { username } }) =>
      await loaders.angebotErstellen({ input, username }),
    angebotAnnehmen: async (_, { input }, { loaders, user: { username } }) =>
      await loaders.angebotAnnehmen({ input, username })
  },
  Viewer: {
    benutzername: (_, __, context) => context.user.username,
    angebot: (parent, args, context, info) => context.loaders.angebot(args.id),
    angebote: async (parent, args, { loaders, user: { username } }, info) => {
      const all = await loaders.angebote();
      return all.filter(({ fahrgast: { id } }) => id === username);
    }
  },
  Subscription: {
    onAngebotChanged: parent => parent
  }
};

export const loaders = {
  angebote: async () => Object.keys(ANGEBOTE).map(id => ANGEBOTE[id]),
  angebot: async id => ANGEBOTE[id],
  angebotErstellen: async ({ input: { von, nach }, username }) => {
    const id = uuid.v1();
    ANGEBOTE[id] = {
      id,
      von,
      nach,
      fahrgast: { id: username, name: username },
      status: "angefragt"
    };
    return ANGEBOTE[id];
  },
  angebotAnnehmen: async ({ input: { angebotId }, username }) => {
    ANGEBOTE[angebotId].status = "angenommen";
    return ANGEBOTE[angebotId];
  }
};

export const channels = {
  onAngebotChanged: (options, args) => ({
    angebotErstelltChannel: { filter: event => true }
  })
};

export const directives = {};

setInterval(() => {
  Object.keys(ANGEBOTE)
    .filter(id => ANGEBOTE[id].status === "angefragt")
    .forEach(id => {
      ANGEBOTE[id] = Object.assign({}, ANGEBOTE[id], {
        status: "warteAufBestaetigung"
      });
      pubsub.publish("angebotErstelltChannel", ANGEBOTE[id]);
    });
}, 10000);
