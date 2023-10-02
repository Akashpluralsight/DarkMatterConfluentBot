// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
import { WebClient, LogLevel, ConversationsListResponse, ConversationsHistoryResponse, ConversationsRepliesResponse } from "@slack/web-api";

// WebClient instantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(process.env.SLACK_API, {
    // LogLevel can be imported and used to make debugging simpler
    logLevel: LogLevel.DEBUG
});
async function findThreadInMessages(slack_channel: string, ts: string) {
    let channelList: string[] = [];
    let cursor: any = undefined;

    try {
        // Call the conversations.list method using the built-in WebClient
        while (true) {

            const result: ConversationsRepliesResponse = cursor && cursor != undefined ? await client.conversations.replies({ channel: slack_channel, ts, include_all_metadata: true, cursor })
                : await client.conversations.replies({ channel: slack_channel, ts, include_all_metadata: true })

            if (!result || !result.messages) {
                break;
            }

            let threadMessages = []

            for (const message of result.messages) {

                if (message.type === "message") {
                    threadMessages.push(message.text)
                }
            }

            cursor = result.response_metadata?.next_cursor;
            if (cursor.length <= 0) {
                break;
            }
            else {
                setTimeout(() => {
                    console.log(`waiting to existing pagination to complete and start ${cursor}`)
                }, 100)
            }
        }

        return channelList

    }
    catch (error) {
        console.error(error);
    }

}
async function findPublicChannelIds(name?: string) {
    let channelList: string[] = [];
    let cursor: any = undefined;

    try {
        // Call the conversations.list method using the built-in WebClient
        while (true) {

            const result: ConversationsListResponse = cursor && cursor != undefined ? await client.conversations.list(cursor)
                : await client.conversations.list();

            if (!result || !result.channels) {
                break;
            }

            for (const channel of result.channels) {

                let channelId = channel.id ? channel.id : ""
                if (name != undefined && channel.name === name) {

                    channelList.push(channelId)
                    console.log("Found conversation ID: " + channel.id);
                    return channelList
                }

                channelList.push(channelId)
            }

            cursor = result.response_metadata?.next_cursor;
            if (cursor.length <= 0) {
                break;
            }
            else {
                setTimeout(() => {
                    console.log(`waiting to existing pagination to complete and start ${cursor}`)
                }, 100)
            }
        }

        return channelList

    }
    catch (error) {
        console.error(error);
    }

}

async function findAllConverstationInChannel(channelLists: string[]) {
    let allchannelMessagesList = [];
    let cursor: any = undefined;

    try {
        // Call the conversations.list method using the built-in WebClient
        for (let channels in channelLists) {

            let channelMessagesList: any = { channels: [] }

            const result: ConversationsHistoryResponse = cursor && cursor != undefined ? await client.conversations.history({ channel: channels, include_all_metadata: true, cursor })
                : await client.conversations.history({ channel: channels, include_all_metadata: true });

            if (!result || !result.messages) {
                break;
            }

            for (const message of result.messages) {

                if (message.type === "message") {

                    if (message.thread_ts) {
                        let Currentmessage = await findThreadInMessages(channels, message.thread_ts)
                        channelMessagesList.channels.push(Currentmessage)
                    }
                    else {
                        channelMessagesList.channels.push(message.text)
                    }
                }

                allchannelMessagesList.push(channelMessagesList)
            }

            cursor = result.response_metadata?.next_cursor;
            if (cursor.length <= 0) {
                break;
            }
            else {
                setTimeout(() => {
                    console.log(`waiting to existing pagination to complete and start ${cursor}`)
                }, 1000)
            }
        }

        return allchannelMessagesList

    }
    catch (error) {
        console.error(error);
    }

}




async function init_starter() {
    // Find conversation with a specified channel `name`
    let channelLists = await findPublicChannelIds("dev-plan-management");

    let allChannelMessageLists = channelLists ? await findAllConverstationInChannel(channelLists) : undefined
}

init_starter()

