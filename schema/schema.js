const graphql = require("graphql");
const fetch = require("node-fetch");
const { JsonRpc } = require("eosjs");

//access "full" eos block-level data
const rpc = new JsonRpc("http://api.eosnewyork.io", { fetch });

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLSchema,
  GraphQLList
} = graphql;

async function getChainInfo() {
  const resp = await rpc.get_info();
  return await resp;
}

async function getBlock(n) {
  const resp = await rpc.get_block(n);
  const actionsCount = await countActions(resp);
  if (actionsCount) {
    resp.actions_count = actionsCount;
  }
  return await resp;
}

const countActions = block => {
  let count = 0;
  block.transactions.forEach(t => {
    if (hasActions(t)) {
      t.trx.transaction.actions.forEach(ac => (count += 1));
    }
  });
  return count;
};

const hasActions = t => {
  if (t.trx.hasOwnProperty("transaction")) {
    return true;
  }
  return false;
};

async function getTenBlocks(num) {
  const blocks = [];
  let n = num;
  for(let i=0; i<10; i++){
    await blocks.push(await getBlock(n-i));
  }
 
  return await blocks;
}

const ChainType = new GraphQLObjectType({
  name: "Chain",
  fields: () => ({
    chain_id: { type: GraphQLString },
    last_irreversible_block_num: { type: GraphQLInt },
    last_irreversible_block_id: { type: GraphQLString },
    head_block_id: { type: GraphQLString },
    head_block_producer: { type: GraphQLString },
    virtual_block_cpu_limit: { type: GraphQLInt },
    virtual_block_net_limit: { type: GraphQLInt },
    block_cpu_limit: { type: GraphQLInt },
    server_version_string: { type: GraphQLString },
    fork_db_head_block_num: { type: GraphQLInt },
    fork_db_head_block_id: { type: GraphQLString }
  })
});

const BlockType = new GraphQLObjectType({
  name: "Block",
  fields: () => ({
    id: { type: GraphQLString },
    actions_count: { type: GraphQLInt },
    block_num: { type: GraphQLInt },
    producer: { type: GraphQLString },
    confirmed: { type: GraphQLInt },
    previous: { type: GraphQLString },
    timestamp: { type: GraphQLString },
    transaction_mroot: { type: GraphQLString },
    action_mroot: { type: GraphQLString },
    transactions: { type: GraphQLList(TransactionType) }
  })
});

const TransactionType = new GraphQLObjectType({
  name: "Transaction",
  fields: () => ({
    status: { type: GraphQLString },
    cpu_usage_us: { type: GraphQLInt },
    net_usage_words: { type: GraphQLInt },
    trx: { type: TrxType }
  })
});

const TrxType = new GraphQLObjectType({
  name: "Trx",
  fields: () => ({
    id: { type: GraphQLString },
    compression: { type: GraphQLString },
    packed_context_free_data: { type: GraphQLString },
    packed_trx: { type: GraphQLString },
    transaction: { type: TransactionReceiptType }
  })
});

const TransactionReceiptType = new GraphQLObjectType({
  name: "TransactionReceipt",
  fields: () => ({
    expiration: { type: GraphQLString },
    ref_block_num: { type: GraphQLInt },
    ref_block_prefix: { type: GraphQLInt },
    max_net_usage_words: { type: GraphQLInt },
    max_cpu_usage_sm: { type: GraphQLInt },
    delay_sec: { type: GraphQLInt },
    actions: { type: GraphQLList(ActionType) }
  })
});

const ActionType = new GraphQLObjectType({
  name: "Action",
  fields: () => ({
    account: { type: GraphQLString },
    name: { type: GraphQLString }
  })
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    getChain: {
      type: ChainType,
      resolve() {
        return getChainInfo();
      }
    },
    getBlock: {
      type: BlockType,
      args: { block_num: { type: GraphQLInt } },
      resolve(parent, args) {
        const block_num = args.block_num;
        return getBlock(block_num);
      }
    },
    getBlocks: {
      type: GraphQLList(BlockType),
      args: { block_num: { type: GraphQLInt } },
      resolve(parent, args) {
        const block_num = args.block_num;
        return getTenBlocks(block_num);
      }
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery
});
