const graphql = require("graphql");
const fetch = require("node-fetch");
const { JsonRpc } = require("eosjs");

const rpc = new JsonRpc("http://api.eosnewyork.io", { fetch });
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLSchema,
  GraphQLList
} = graphql;

const ChainType = new GraphQLObjectType({
  name: "Chain",
  fields: () => ({
    server_version: { type: GraphQLString },
    server_version_string: { type: GraphQLString },
    chain_id: { type: GraphQLString },
    last_irreversible_block_id: { type: GraphQLString },
    last_irreversible_block_num: { type: GraphQLInt },
    head_block_id: { type: GraphQLString },
    head_block_num: { type: GraphQLInt },
    head_block_time: { type: GraphQLString },
    head_block_producer: { type: GraphQLString },
    fork_db_head_block_num: { type: GraphQLInt },
    fork_db_head_block_id: { type: GraphQLString },
    block_cpu_limit: { type: GraphQLInt },
    block_net_limit: { type: GraphQLInt },
    virtual_block_cpu_limit: { type: GraphQLInt },
    virtual_block_net_limit: { type: GraphQLInt }
  })
});
const BlockType = new GraphQLObjectType({
  name: "Block",
  fields: () => ({
    id: { type: GraphQLString },
    block_num: { type: GraphQLInt },
    timestamp: { type: GraphQLString },
    producer: { type: GraphQLString },
    confirmed: { type: GraphQLInt },
    previous: { type: GraphQLString },
    transaction_mroot: { type: GraphQLString },
    action_mroot: { type: GraphQLString },
    schedule_version: { type: GraphQLInt },
    producer_signature: { type: GraphQLString },
    transactions: { type: GraphQLList(TransactionType) },
    virtual_block_cpu_limit: { type: GraphQLInt },
    virtual_block_net_limit: { type: GraphQLInt },
    actions_count: { type: GraphQLInt },
    abi_array: { type: GraphQLList(AbiType) }
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
    signatures: { type: GraphQLList(GraphQLString) },
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
    actions: { type: GraphQLList(UserActionType) }
  })
});
const UserActionType = new GraphQLObjectType({
  name: "Action",
  fields: () => ({
    account: { type: GraphQLString },
    name: { type: GraphQLString },
    data: { type: UserActionDataType }
  })
});
const UserActionDataType = new GraphQLObjectType({
  name: "ActionData",
  fields: () => ({
    from: { type: GraphQLString },
    to: { type: GraphQLString }
  })
});
const AbiType = new GraphQLObjectType({
  name: "AbiType",
  fields: () => ({
    version: { type: GraphQLString },
    types: { type: GraphQLList(GraphQLString) },
    structs: { type: GraphQLList(StructType) },
    actions: { type: GraphQLList(AbiActionType) },
    tables: { type: GraphQLList(TableStructType) },
    ricardian_clauses: { type: GraphQLList(GraphQLString) },
    error_messages: { type: GraphQLList(GraphQLString) },
    abi_extensions: { type: GraphQLList(GraphQLString) },
    variants: { type: GraphQLList(GraphQLString) }
  })
});
const AbiActionType = new GraphQLObjectType({
  name: "AbiActionType",
  fields: () => ({
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    ricardian_contract: { type: GraphQLString }
  })
});
const StructType = new GraphQLObjectType({
  name: "StructType",
  fields: () => ({
    name: { type: GraphQLString },
    base: { type: GraphQLString },
    fields: { type: GraphQLList(StructFieldType) }
  })
});
const StructFieldType = new GraphQLObjectType({
  name: "StructFieldType",
  fields: () => ({
    name: { type: GraphQLString },
    type: { type: GraphQLString }
  })
});
const TableStructType = new GraphQLObjectType({
  name: "TableStructType",
  fields: () => ({
    name: { type: GraphQLString },
    index_type: { type: GraphQLString },
    key_names: { type: GraphQLList(GraphQLString) },
    key_types: { type: GraphQLList(GraphQLString) },
    type: { type: GraphQLString }
  })
});
async function getChainMetadata() {
  try {
    const data = await rpc.get_info();
    return data;
  } catch (err) {
    console.log(err);
  }
}
async function getBlock(num) {
  const data = await rpc.get_block(num);
  try {
    const count = await countActions(data);
    defineProperty(data, "actions_count", count);
    return data;
  } catch (err) {
    console.log(err);
  }
}
async function getBlocks(num, limit) {
  const blocks = [];
  try {
    for (let i = 0; i < limit; i++) {
      blocks.push(await getBlock(num - i));
    }
  } catch (err) {
    console.log(err);
  }
  return blocks;
}
const countActions = block => {
  block.transactions.forEach(t => {
    if (hasActions(t)) {
      return t.trx.transaction.actions.length;
    }
  });
  return 0;
};
const hasActions = t => {
  if (t.trx.hasOwnProperty("transaction")) {
    return true;
  }
  return false;
};
const defineProperty = (obj, k, v) => {
  obj[k] = v;
  return obj;
};
async function getAbi(account) {
  try {
    const data = await rpc.get_abi(account);
    return data.abi;
  } catch (err) {
    console.log(err);
  }
}
const RootQuery = new GraphQLObjectType({
  name: "RootQuery",
  fields: {
    getChainMetadata: {
      type: ChainType,
      resolve() {
        return getChainMetadata();
      }
    },
    getBlock: {
      type: BlockType,
      args: { block_num: { type: GraphQLInt } },
      resolve(parent, args) {
        const num = args.block_num;
        return getBlock(num);
      }
    },
    getBlocks: {
      type: GraphQLList(BlockType),
      args: { block_num: { type: GraphQLInt }, limit: { type: GraphQLInt } },
      resolve(parent, args) {
        const num = args.block_num;
        const limit = args.limit;
        return getBlocks(num, limit);
      }
    },
    getAbi: {
      type: AbiType,
      args: { account: { type: GraphQLString } },
      resolve(parent, args) {
        const account = args.account;
        return getAbi(account);
      }
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery
});
